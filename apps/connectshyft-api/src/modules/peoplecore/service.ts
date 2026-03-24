import type {
  CreateActivityInput,
  GetActivityInput,
  ListActivitiesInput,
} from './activity';
import type {
  ResolverDecisionInput,
  ResolverReview,
  ResolverReviewStatus,
  ResolverResolutionType,
  ValidatedResolverDecisionInput,
} from '@shyft/contracts';
import {
  deriveResolverDecisionStatus,
  isResolverActionType,
  isResolverReviewActiveStatus,
  isResolverReviewResolvedStatus,
  isResolverReviewTerminalStatus,
  RESOLVER_ACTION_STATUS_MAP,
} from '@shyft/contracts';
import {
  buildPeopleCoreMergeEventPublisher,
  type PeopleCoreMergeEventPublisher,
} from './events';
import {
  KnexPeopleCoreStore,
  type AppendContactPointEventInput,
  type CreateContactPointInput,
  type CreateContactPointLinkInput,
  type CreateHouseholdInput,
  type CreateHouseholdMembershipInput,
  type CreatePersonInput,
  type CreateResolverReviewInput,
  type GetContactPointInput,
  type GetHouseholdInput,
  type MergePersonInput,
  type PeopleCoreMergeResult,
  type PersonMergeStatus,
  type GetPersonInput,
  type ListContactPointLinksInput,
  type GetResolverReviewInput,
  type ListContactPointEventsInput,
  type ListContactPointsByNormalizedValueInput,
  type ListCurrentContactPointLinksInput,
  type ListHouseholdMembershipsInput,
  type ListPersonsInput,
  type ListResolverReviewsInput,
  type PeopleCoreStore,
  type UpdateResolverReviewInput,
  PeopleCoreScopeViolationError,
} from './store';
import {
  InvalidContactPointStatusError,
  computeContactPointStatus,
} from './lifecycle';

const CONTACT_POINT_LIFECYCLE_EVENT_LIMIT = 200;

const RESOLVER_ALLOWED_TRANSITIONS: Record<ResolverReviewStatus, readonly ResolverReviewStatus[]> = {
  pending: [
    'queued',
    'in_review',
    'resolved_confirmed_existing',
    'resolved_confirmed_new',
    'resolved_shared_contact',
    'resolved_reassigned',
    'resolved_merged',
    'dismissed',
  ],
  queued: [
    'in_review',
    'waiting_for_more_info',
    'resolved_confirmed_existing',
    'resolved_confirmed_new',
    'resolved_shared_contact',
    'resolved_reassigned',
    'resolved_merged',
    'dismissed',
  ],
  in_review: [
    'waiting_for_more_info',
    'resolved_confirmed_existing',
    'resolved_confirmed_new',
    'resolved_shared_contact',
    'resolved_reassigned',
    'resolved_merged',
    'dismissed',
  ],
  waiting_for_more_info: [
    'in_review',
    'resolved_confirmed_existing',
    'resolved_confirmed_new',
    'resolved_shared_contact',
    'resolved_reassigned',
    'resolved_merged',
    'dismissed',
  ],
  resolved_confirmed_existing: [],
  resolved_confirmed_new: [],
  resolved_shared_contact: [],
  resolved_reassigned: [],
  resolved_merged: [],
  dismissed: [],
};

type ResolverValidationReason = 'REQUIRED' | 'INVALID' | 'CONFLICT';

export type ResolverValidationFieldError = {
  field: string;
  reason: ResolverValidationReason;
  message: string;
};

export type UpdateResolverReviewLifecycleInput = {
  tenantId: string;
  reviewId: string;
  reviewStatus: ResolverReviewStatus;
  assignedResolverUserId?: string;
  startedAt?: string;
  resolvedAt?: string;
  resolutionType?: ResolverResolutionType;
  resolutionReason?: string;
  resolutionNotes?: string;
};

const isMissingPersistenceError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string };
  return candidate.code === '42P01'
    || candidate.code === '3F000'
    || candidate.code === '42703';
};

export class PeopleCorePersistenceUnavailableError extends Error {
  readonly code = 'PEOPLECORE_PERSISTENCE_UNAVAILABLE';

  constructor(cause?: unknown) {
    super('PeopleCore persistence is unavailable.');
    this.name = 'PeopleCorePersistenceUnavailableError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class ContactPointLifecycleComputationError extends Error {
  readonly code = 'CONTACT_POINT_LIFECYCLE_COMPUTATION_ERROR';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ContactPointLifecycleComputationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class ResolverReviewValidationError extends Error {
  readonly code: string = 'PEOPLECORE_RESOLVER_REVIEW_VALIDATION_ERROR';

  constructor(
    message: string,
    readonly fieldErrors: ResolverValidationFieldError[] = [],
    cause?: unknown,
  ) {
    super(message);
    this.name = 'ResolverReviewValidationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class InvalidResolverReviewTransitionError extends ResolverReviewValidationError {
  readonly code = 'PEOPLECORE_INVALID_RESOLVER_REVIEW_TRANSITION';

  constructor(message: string, fieldErrors: ResolverValidationFieldError[] = [], cause?: unknown) {
    super(message, fieldErrors, cause);
    this.name = 'InvalidResolverReviewTransitionError';
  }
}

const nowIsoUtc = (): string => new Date().toISOString();

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const buildFieldError = (
  field: string,
  reason: ResolverValidationReason,
  message: string,
): ResolverValidationFieldError => ({
  field,
  reason,
  message,
});

const requireNormalizedString = (
  value: unknown,
  field: string,
  message: string,
): string => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new ResolverReviewValidationError(message, [
      buildFieldError(field, 'REQUIRED', message),
    ]);
  }

  return normalized;
};

const assertResolutionTypeMatchesStatus = (
  reviewStatus: ResolverReviewStatus,
  resolutionType: ResolverResolutionType,
): void => {
  const expectedStatus = RESOLVER_ACTION_STATUS_MAP[resolutionType];
  if (reviewStatus !== expectedStatus) {
    throw new ResolverReviewValidationError(
      `Resolver action ${resolutionType} requires reviewStatus ${expectedStatus}.`,
      [
        buildFieldError(
          'reviewStatus',
          'CONFLICT',
          `reviewStatus must be ${expectedStatus} for ${resolutionType}.`,
        ),
      ],
    );
  }
};

export const assertResolverReviewTransitionAllowed = (
  currentStatus: ResolverReviewStatus,
  nextStatus: ResolverReviewStatus,
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (isResolverReviewTerminalStatus(currentStatus)) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver reviews in ${currentStatus} cannot transition to ${nextStatus}.`,
      [
        buildFieldError(
          'reviewStatus',
          'INVALID',
          `reviewStatus ${currentStatus} is terminal and cannot transition to ${nextStatus}.`,
        ),
      ],
    );
  }

  const allowedTransitions = RESOLVER_ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedTransitions.includes(nextStatus)) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver reviews cannot transition from ${currentStatus} to ${nextStatus}.`,
      [
        buildFieldError(
          'reviewStatus',
          'INVALID',
          `reviewStatus ${currentStatus} cannot transition to ${nextStatus}.`,
        ),
      ],
    );
  }
};

export const validateResolverDecisionInput = (
  input: ResolverDecisionInput,
): ValidatedResolverDecisionInput => {
  const tenantId = requireNormalizedString(
    input.tenantId,
    'tenantId',
    'tenantId is required.',
  );
  const reviewId = requireNormalizedString(
    input.reviewId,
    'reviewId',
    'reviewId is required.',
  );
  const actorUserId = requireNormalizedString(
    input.actorUserId,
    'actorUserId',
    'actorUserId is required.',
  );
  if (!isResolverActionType(input.action)) {
    throw new ResolverReviewValidationError(
      'action must be a canonical resolver action.',
      [
        buildFieldError(
          'action',
          'INVALID',
          'action must be a canonical resolver action.',
        ),
      ],
    );
  }

  let personId = normalizeOptionalString(input.personId);
  const provisionalPersonId = normalizeOptionalString(input.provisionalPersonId);
  const sourcePersonId = normalizeOptionalString(input.sourcePersonId);
  const targetPersonId = normalizeOptionalString(input.targetPersonId);
  const contactPointId = normalizeOptionalString(input.contactPointId);
  const ambiguityEventId = normalizeOptionalString(input.ambiguityEventId);
  const reason = normalizeOptionalString(input.reason);
  const notes = normalizeOptionalString(input.notes);

  switch (input.action) {
    case 'confirm_existing_person':
      if (!personId) {
        throw new ResolverReviewValidationError(
          'confirm_existing_person requires personId.',
          [
            buildFieldError(
              'personId',
              'REQUIRED',
              'personId is required for confirm_existing_person.',
            ),
          ],
        );
      }
      break;
    case 'confirm_new_person':
      if (!personId && provisionalPersonId) {
        personId = provisionalPersonId;
      }
      if (!personId) {
        throw new ResolverReviewValidationError(
          'confirm_new_person requires personId or provisionalPersonId.',
          [
            buildFieldError(
              'personId',
              'REQUIRED',
              'personId or provisionalPersonId is required for confirm_new_person.',
            ),
          ],
        );
      }
      if (provisionalPersonId && personId !== provisionalPersonId) {
        throw new ResolverReviewValidationError(
          'confirm_new_person cannot target a different person than provisionalPersonId.',
          [
            buildFieldError(
              'personId',
              'CONFLICT',
              'personId must match provisionalPersonId when both are provided.',
            ),
          ],
        );
      }
      break;
    case 'merge_people':
      if (!sourcePersonId) {
        throw new ResolverReviewValidationError(
          'merge_people requires sourcePersonId.',
          [
            buildFieldError(
              'sourcePersonId',
              'REQUIRED',
              'sourcePersonId is required for merge_people.',
            ),
          ],
        );
      }
      if (!targetPersonId) {
        throw new ResolverReviewValidationError(
          'merge_people requires targetPersonId.',
          [
            buildFieldError(
              'targetPersonId',
              'REQUIRED',
              'targetPersonId is required for merge_people.',
            ),
          ],
        );
      }
      if (sourcePersonId === targetPersonId) {
        throw new ResolverReviewValidationError(
          'merge_people requires different sourcePersonId and targetPersonId.',
          [
            buildFieldError(
              'targetPersonId',
              'CONFLICT',
              'targetPersonId must differ from sourcePersonId for merge_people.',
            ),
          ],
        );
      }
      break;
    case 'link_without_merge':
      if (!personId) {
        throw new ResolverReviewValidationError(
          'link_without_merge requires personId.',
          [
            buildFieldError(
              'personId',
              'REQUIRED',
              'personId is required for link_without_merge.',
            ),
          ],
        );
      }
      break;
    case 'mark_shared_contact':
      break;
    case 'reassign_contact_point':
      if (!contactPointId) {
        throw new ResolverReviewValidationError(
          'reassign_contact_point requires contactPointId.',
          [
            buildFieldError(
              'contactPointId',
              'REQUIRED',
              'contactPointId is required for reassign_contact_point.',
            ),
          ],
        );
      }
      if (!personId) {
        throw new ResolverReviewValidationError(
          'reassign_contact_point requires personId.',
          [
            buildFieldError(
              'personId',
              'REQUIRED',
              'personId is required for reassign_contact_point.',
            ),
          ],
        );
      }
      break;
    case 'dismiss_no_action':
      if (!reason) {
        throw new ResolverReviewValidationError(
          'dismiss_no_action requires a reason.',
          [
            buildFieldError(
              'reason',
              'REQUIRED',
              'reason is required for dismiss_no_action.',
            ),
          ],
        );
      }
      break;
    default: {
      const exhaustiveAction: never = input.action;
      throw new ResolverReviewValidationError(
        `Unsupported resolver action: ${String(exhaustiveAction)}.`,
      );
    }
  }

  return {
    tenantId,
    reviewId,
    action: input.action,
    actorUserId,
    reason,
    notes,
    personId,
    sourcePersonId,
    targetPersonId,
    contactPointId,
    ambiguityEventId,
  };
};

const buildResolverReviewUpdatePayload = (
  currentReview: ResolverReview,
  input: UpdateResolverReviewLifecycleInput,
): UpdateResolverReviewInput => {
  const assignedResolverUserId = normalizeOptionalString(input.assignedResolverUserId)
    ?? currentReview.assignedResolverUserId
    ?? null;
  const startedAt = normalizeOptionalString(input.startedAt)
    ?? currentReview.startedAt
    ?? (
      input.reviewStatus === 'in_review'
      || isResolverReviewResolvedStatus(input.reviewStatus)
      || input.reviewStatus === 'dismissed'
        ? nowIsoUtc()
        : null
    );
  const resolutionReason = normalizeOptionalString(input.resolutionReason) ?? null;
  const resolutionNotes = normalizeOptionalString(input.resolutionNotes) ?? null;

  if (isResolverReviewActiveStatus(input.reviewStatus)) {
    return {
      tenantId: input.tenantId,
      reviewId: input.reviewId,
      reviewStatus: input.reviewStatus,
      assignedResolverUserId,
      startedAt,
      resolvedAt: null,
      resolutionType: null,
      resolutionReason: null,
      resolutionNotes: null,
    };
  }

  const resolutionType = input.resolutionType;
  if (!resolutionType) {
    throw new ResolverReviewValidationError(
      `reviewStatus ${input.reviewStatus} requires resolutionType.`,
      [
        buildFieldError(
          'resolutionType',
          'REQUIRED',
          `resolutionType is required for reviewStatus ${input.reviewStatus}.`,
        ),
      ],
    );
  }

  assertResolutionTypeMatchesStatus(input.reviewStatus, resolutionType);

  if (input.reviewStatus === 'dismissed' && !resolutionReason) {
    throw new ResolverReviewValidationError(
      'dismissed resolver reviews require resolutionReason.',
      [
        buildFieldError(
          'resolutionReason',
          'REQUIRED',
          'resolutionReason is required when reviewStatus is dismissed.',
        ),
      ],
    );
  }

  return {
    tenantId: input.tenantId,
    reviewId: input.reviewId,
    reviewStatus: input.reviewStatus,
    assignedResolverUserId,
    startedAt,
    resolvedAt: normalizeOptionalString(input.resolvedAt) ?? currentReview.resolvedAt ?? nowIsoUtc(),
    resolutionType,
    resolutionReason,
    resolutionNotes,
  };
};

const assertTerminalReviewMutationAllowed = (
  currentReview: ResolverReview,
  input: UpdateResolverReviewLifecycleInput,
): void => {
  if (!isResolverReviewTerminalStatus(currentReview.reviewStatus)) {
    return;
  }

  if (currentReview.reviewStatus !== input.reviewStatus) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already terminal in ${currentReview.reviewStatus}.`,
      [
        buildFieldError(
          'reviewStatus',
          'INVALID',
          `reviewStatus ${currentReview.reviewStatus} is terminal and cannot transition to ${input.reviewStatus}.`,
        ),
      ],
    );
  }

  if (!input.resolutionType) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already terminal and requires explicit resolutionType replay.`,
      [
        buildFieldError(
          'resolutionType',
          'REQUIRED',
          'resolutionType is required when replaying a terminal resolver review update.',
        ),
      ],
    );
  }

  if (currentReview.resolutionType !== input.resolutionType) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already terminal with ${currentReview.resolutionType}.`,
      [
        buildFieldError(
          'resolutionType',
          'CONFLICT',
          `resolutionType ${currentReview.resolutionType} cannot be replaced with ${input.resolutionType}.`,
        ),
      ],
    );
  }

  const nextResolutionReason = normalizeOptionalString(input.resolutionReason);
  if (nextResolutionReason && nextResolutionReason !== currentReview.resolutionReason) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already terminal with a different resolutionReason.`,
      [
        buildFieldError(
          'resolutionReason',
          'CONFLICT',
          'resolutionReason cannot change once a resolver review is terminal.',
        ),
      ],
    );
  }

  const nextResolutionNotes = normalizeOptionalString(input.resolutionNotes);
  if (nextResolutionNotes && nextResolutionNotes !== currentReview.resolutionNotes) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already terminal with different resolutionNotes.`,
      [
        buildFieldError(
          'resolutionNotes',
          'CONFLICT',
          'resolutionNotes cannot change once a resolver review is terminal.',
        ),
      ],
    );
  }

  const nextDecisionStatus = deriveResolverDecisionStatus(input.reviewStatus);
  const currentDecisionStatus = deriveResolverDecisionStatus(currentReview.reviewStatus);
  if (nextDecisionStatus && currentDecisionStatus && nextDecisionStatus !== currentDecisionStatus) {
    throw new InvalidResolverReviewTransitionError(
      `Resolver review ${currentReview.id} is already ${currentDecisionStatus}.`,
      [
        buildFieldError(
          'reviewStatus',
          'CONFLICT',
          `reviewStatus ${currentReview.reviewStatus} cannot be replaced with ${input.reviewStatus}.`,
        ),
      ],
    );
  }
};

export class AsyncPeopleCoreService {
  constructor(
    private readonly store: PeopleCoreStore = new KnexPeopleCoreStore(),
    private readonly mergeEventPublisher: PeopleCoreMergeEventPublisher =
      buildPeopleCoreMergeEventPublisher(),
  ) {}

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isMissingPersistenceError(error)) {
        throw new PeopleCorePersistenceUnavailableError(error);
      }

      throw error;
    }
  }

  private async recomputeContactPointLifecycle(
    input: {
      tenantId: string;
      contactPointId: string;
    },
  ): Promise<void> {
    try {
      const [contactPoint, events, links] = await Promise.all([
        this.store.getContactPoint({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        }),
        this.store.listContactPointEvents({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
          limit: CONTACT_POINT_LIFECYCLE_EVENT_LIMIT,
        }),
        this.store.listCurrentContactPointLinks({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        }),
      ]);

      if (!contactPoint) {
        throw new PeopleCoreScopeViolationError(
          `ContactPoint ${input.contactPointId} is not available in tenant ${input.tenantId}.`,
        );
      }

      const computedStatus = computeContactPointStatus(events, links);
      if (computedStatus !== contactPoint.status) {
        await this.store.updateContactPointStatus({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
          newStatus: computedStatus,
        });
      }
    } catch (error) {
      if (
        error instanceof InvalidContactPointStatusError
        || error instanceof PeopleCoreScopeViolationError
        || isMissingPersistenceError(error)
      ) {
        throw error;
      }

      throw new ContactPointLifecycleComputationError(
        `Failed to compute ContactPoint lifecycle for ${input.contactPointId}.`,
        error,
      );
    }
  }

  createPerson(input: CreatePersonInput) {
    return this.execute(() => this.store.createPerson(input));
  }

  createActivity(input: CreateActivityInput) {
    return this.execute(() => this.store.createActivity(input));
  }

  getPerson(input: GetPersonInput) {
    return this.execute(() => this.store.getPerson(input));
  }

  getActivity(input: GetActivityInput) {
    return this.execute(() => this.store.getActivity(input));
  }

  listPersons(input: ListPersonsInput) {
    return this.execute(() => this.store.listPersons(input));
  }

  async mergePerson(input: MergePersonInput): Promise<PeopleCoreMergeResult> {
    const result = await this.execute(() => this.store.mergePerson(input));

    if (result.didPersistMerge) {
      await this.mergeEventPublisher.publishPersonMerged({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        provisionalPersonId: result.mergedProvisionalPersonId,
        canonicalPersonId: result.canonicalPersonId,
        performedByUserId: input.performedByUserId,
        mergeReason: input.mergeReason,
        autoMergedContactPointLinkIds: result.autoMergedContactPointLinkIds,
        reviewContactPointLinkIds: result.reviewContactPointLinkIds,
        resolverReviewId: result.resolverReviewId,
      });
    }

    return result;
  }

  getPersonMergeStatus(input: GetPersonInput): Promise<PersonMergeStatus> {
    return this.execute(() => this.store.getPersonMergeStatus(input));
  }

  listActivities(input: ListActivitiesInput) {
    return this.execute(() => this.store.listActivities(input));
  }

  createHousehold(input: CreateHouseholdInput) {
    return this.execute(() => this.store.createHousehold(input));
  }

  getHousehold(input: GetHouseholdInput) {
    return this.execute(() => this.store.getHousehold(input));
  }

  createHouseholdMembership(input: CreateHouseholdMembershipInput) {
    return this.execute(() => this.store.createHouseholdMembership(input));
  }

  listHouseholdMemberships(input: ListHouseholdMembershipsInput) {
    return this.execute(() => this.store.listHouseholdMemberships(input));
  }

  createContactPoint(input: CreateContactPointInput) {
    return this.execute(() => this.store.createContactPoint(input));
  }

  getContactPoint(input: GetContactPointInput) {
    return this.execute(() => this.store.getContactPoint(input));
  }

  listContactPointsByNormalizedValue(input: ListContactPointsByNormalizedValueInput) {
    return this.execute(() => this.store.listContactPointsByNormalizedValue(input));
  }

  createContactPointLink(input: CreateContactPointLinkInput) {
    return this.execute(async () => {
      const link = await this.store.createContactPointLink(input);
      await this.recomputeContactPointLifecycle({
        tenantId: input.tenantId,
        contactPointId: input.contactPointId,
      });
      return link;
    });
  }

  listContactPointLinks(input: ListContactPointLinksInput) {
    return this.execute(() => this.store.listContactPointLinks(input));
  }

  listCurrentContactPointLinks(input: ListCurrentContactPointLinksInput) {
    return this.execute(() => this.store.listCurrentContactPointLinks(input));
  }

  appendContactPointEvent(input: AppendContactPointEventInput) {
    return this.execute(async () => {
      const event = await this.store.appendContactPointEvent(input);
      if (input.eventType !== 'lifecycle_changed') {
        await this.recomputeContactPointLifecycle({
          tenantId: input.tenantId,
          contactPointId: input.contactPointId,
        });
      }
      return event;
    });
  }

  listContactPointEvents(input: ListContactPointEventsInput) {
    return this.execute(() => this.store.listContactPointEvents(input));
  }

  createResolverReview(input: CreateResolverReviewInput) {
    return this.execute(() => {
      if (isResolverReviewActiveStatus(input.reviewStatus)) {
        if (input.resolutionType || input.resolvedAt) {
          throw new ResolverReviewValidationError(
            `Active resolver reviews cannot persist terminal fields for ${input.reviewStatus}.`,
            [
              buildFieldError(
                'resolutionType',
                'INVALID',
                'resolutionType is only allowed for terminal resolver reviews.',
              ),
            ],
          );
        }
      } else {
        if (!input.resolutionType) {
          throw new ResolverReviewValidationError(
            `Terminal resolver reviews require resolutionType for ${input.reviewStatus}.`,
            [
              buildFieldError(
                'resolutionType',
                'REQUIRED',
                `resolutionType is required for reviewStatus ${input.reviewStatus}.`,
              ),
            ],
          );
        }
        assertResolutionTypeMatchesStatus(input.reviewStatus, input.resolutionType);
        if (input.reviewStatus === 'dismissed' && !normalizeOptionalString(input.resolutionReason)) {
          throw new ResolverReviewValidationError(
            'Dismissed resolver reviews require resolutionReason.',
            [
              buildFieldError(
                'resolutionReason',
                'REQUIRED',
                'resolutionReason is required when reviewStatus is dismissed.',
              ),
            ],
          );
        }
      }

      return this.store.createResolverReview(input);
    });
  }

  updateResolverReview(input: UpdateResolverReviewLifecycleInput) {
    return this.execute(async () => {
      const currentReview = await this.store.getResolverReview({
        tenantId: input.tenantId,
        reviewId: input.reviewId,
      });

      if (!currentReview) {
        throw new PeopleCoreScopeViolationError(
          `Resolver review ${input.reviewId} is not available in tenant ${input.tenantId}.`,
        );
      }

      assertTerminalReviewMutationAllowed(currentReview, input);
      if (!isResolverReviewTerminalStatus(currentReview.reviewStatus)) {
        assertResolverReviewTransitionAllowed(currentReview.reviewStatus, input.reviewStatus);
      }

      if (
        isResolverReviewTerminalStatus(currentReview.reviewStatus)
        && currentReview.reviewStatus === input.reviewStatus
      ) {
        return currentReview;
      }

      const updated = await this.store.updateResolverReview(
        buildResolverReviewUpdatePayload(currentReview, input),
      );

      if (!updated) {
        throw new PeopleCoreScopeViolationError(
          `Resolver review ${input.reviewId} is not available in tenant ${input.tenantId}.`,
        );
      }

      return updated;
    });
  }

  getResolverReview(input: GetResolverReviewInput) {
    return this.execute(() => this.store.getResolverReview(input));
  }

  listResolverReviews(input: ListResolverReviewsInput) {
    return this.execute(() => this.store.listResolverReviews(input));
  }
}

export const peopleCoreServiceAsync = new AsyncPeopleCoreService();
