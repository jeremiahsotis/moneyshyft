import type {
  CreateActivityInput,
  GetActivityInput,
  ListActivitiesInput,
} from './activity';
import { createHash } from 'node:crypto';
import type {
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
  ConnectShyftResolverQueueItemType,
  ConnectShyftResolverReviewRecord,
  ResolverActionType,
  ResolverDecisionInput,
  ResolverDecisionResult,
  ResolverReview,
  ResolverReviewStatus,
  ResolverResolutionType,
  ValidatedResolverDecisionInput,
} from '@shyft/contracts';
import {
  deriveResolverDecisionStatus,
  isResolverActionType,
  isResolverRebindReviewType,
  isResolverReviewActiveStatus,
  isResolverReviewResolvedStatus,
  isResolverReviewTerminalStatus,
  RESOLVER_ACTION_STATUS_MAP,
} from '@shyft/contracts';
import { normalizeRoles } from '../../platform/rbac/capabilities';
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
export const CONNECTSHYFT_REBIND_REVIEW_TRIGGER_SOURCE_TYPE = 'connectshyft_person_rebind_review';
const CONNECTSHYFT_REBIND_REVIEW_RESOLVER_REVIEW_NAMESPACE = 'f4f9a8f7-49e0-5e25-aa9b-f0f93ad7c9c4';

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
    'queued',
    'waiting_for_more_info',
    'resolved_confirmed_existing',
    'resolved_confirmed_new',
    'resolved_shared_contact',
    'resolved_reassigned',
    'resolved_merged',
    'dismissed',
  ],
  waiting_for_more_info: [
    'queued',
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
  assignedResolverUserId?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  resolutionType?: ResolverResolutionType | null;
  resolutionReason?: string | null;
  resolutionNotes?: string | null;
};

type ResolverQueueActorInput = {
  tenantId: string;
  actorUserId: string;
  actorRoles: string[];
};

export type ListResolverQueueInput = ResolverQueueActorInput & {
  orgUnitId?: string;
  itemType?: ConnectShyftResolverQueueItemType;
  status?: ResolverReviewStatus | null;
  includeTerminal?: boolean;
};

export type ResolverQueueItemLocatorInput = ResolverQueueActorInput & {
  itemType: ConnectShyftResolverQueueItemType;
  itemId: string;
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

const isUniqueViolationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: string }).code === '23505';
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

export class ResolverQueueAuthorizationError extends Error {
  readonly code = 'PEOPLECORE_RESOLVER_QUEUE_FORBIDDEN';

  constructor(message = 'Resolver queue access requires a tenant-admin actor.') {
    super(message);
    this.name = 'ResolverQueueAuthorizationError';
  }
}

export class ResolverQueueClaimRequiredError extends Error {
  readonly code = 'PEOPLECORE_RESOLVER_QUEUE_CLAIM_REQUIRED';

  constructor(message = 'Resolver queue work must be claimed before action.') {
    super(message);
    this.name = 'ResolverQueueClaimRequiredError';
  }
}

export class ResolverQueueClaimConflictError extends Error {
  readonly code = 'PEOPLECORE_RESOLVER_QUEUE_CLAIM_CONFLICT';

  constructor(message = 'Resolver queue work is already claimed by another resolver.') {
    super(message);
    this.name = 'ResolverQueueClaimConflictError';
  }
}

const nowIsoUtc = (): string => new Date().toISOString();

const uniqueStrings = (values: Iterable<string | null | undefined>): string[] =>
  Array.from(
    new Set(
      Array.from(values)
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const isTenantAdminResolverActor = (actorRoles: string[]): boolean =>
  normalizeRoles(actorRoles).includes('TENANT_ADMIN');

const assertTenantAdminResolverActor = (actorRoles: string[]): void => {
  if (!isTenantAdminResolverActor(actorRoles)) {
    throw new ResolverQueueAuthorizationError(
      'Resolver queue actions are limited to tenant-admin actors in MVP.',
    );
  }
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

const toResolverReviewRecord = (
  review: ResolverReview,
): ConnectShyftResolverReviewRecord => ({
  ...review,
  actionable: isResolverReviewActiveStatus(review.reviewStatus),
  terminal: isResolverReviewTerminalStatus(review.reviewStatus),
  decisionStatus: deriveResolverDecisionStatus(review.reviewStatus),
});

export const isQueueBackedRebindReview = (review: ResolverReview): boolean => (
  isResolverRebindReviewType(review.reviewType)
  && review.triggerSourceType === CONNECTSHYFT_REBIND_REVIEW_TRIGGER_SOURCE_TYPE
);

export const resolveResolverQueueItemType = (
  review: ResolverReview,
): ConnectShyftResolverQueueItemType => (
  isQueueBackedRebindReview(review) ? 'rebind_review' : 'identity_review'
);

const buildRebindReviewResolverReviewId = (rebindHistoryId: string): string => (
  buildDeterministicUuid(
    CONNECTSHYFT_REBIND_REVIEW_RESOLVER_REVIEW_NAMESPACE,
    rebindHistoryId,
  )
);

const buildDeterministicUuid = (namespace: string, value: string): string => {
  const digest = createHash('sha1')
    .update(`${namespace}:${value}`)
    .digest('hex')
    .slice(0, 32)
    .split('');

  digest[12] = '5';
  digest[16] = ((parseInt(digest[16] || '0', 16) & 0x3) | 0x8).toString(16);

  return [
    digest.slice(0, 8).join(''),
    digest.slice(8, 12).join(''),
    digest.slice(12, 16).join(''),
    digest.slice(16, 20).join(''),
    digest.slice(20, 32).join(''),
  ].join('-');
};

const buildResolverQueueClaimMetadata = (
  review: ResolverReview,
  actorUserId: string,
): Pick<
  ConnectShyftResolverQueueItemRecord,
  'claimState' | 'claimantUserId' | 'claimedByCurrentUser' | 'claimable' | 'releasable' | 'actionable'
> => {
  const active = isResolverReviewActiveStatus(review.reviewStatus);
  const actionableActiveState = active && review.reviewStatus !== 'waiting_for_more_info';
  const claimantUserId = active
    ? review.assignedResolverUserId ?? null
    : null;

  if (!claimantUserId) {
    return {
      claimState: 'unclaimed',
      claimantUserId: null,
      claimedByCurrentUser: false,
      claimable: actionableActiveState,
      releasable: false,
      actionable: false,
    };
  }

  if (claimantUserId === actorUserId) {
    return {
      claimState: 'claimed_by_current_user',
      claimantUserId,
      claimedByCurrentUser: true,
      claimable: false,
      releasable: active,
      actionable: actionableActiveState,
    };
  }

  return {
    claimState: 'claimed_by_other',
    claimantUserId,
    claimedByCurrentUser: false,
    claimable: false,
    releasable: false,
    actionable: false,
  };
};

const toResolverQueueItem = (
  review: ResolverReview,
  actorUserId: string,
): ConnectShyftResolverQueueItemRecord => {
  const active = isResolverReviewActiveStatus(review.reviewStatus);
  const terminal = isResolverReviewTerminalStatus(review.reviewStatus);
  const claimMetadata = buildResolverQueueClaimMetadata(review, actorUserId);

  return {
    id: review.id,
    itemType: resolveResolverQueueItemType(review),
    status: review.reviewStatus,
    active,
    terminal,
    ...claimMetadata,
    resolverReviewId: review.id,
    orgUnitId: review.orgUnitId,
    conversationId: review.conversationId ?? null,
    contactPointId: review.contactPointId ?? null,
    threadId: null,
    personIds: uniqueStrings([
      review.provisionalPersonId,
      ...review.candidatePersonIds,
    ]),
    triggerSourceType: review.triggerSourceType,
    triggerSourceId: review.triggerSourceId,
    requestedAt: review.requestedAt,
    startedAt: review.startedAt ?? null,
    resolvedAt: review.resolvedAt ?? null,
  };
};

const assertResolverReviewClaimedByActor = (
  review: ResolverReview,
  actorUserId: string,
): void => {
  const claimantUserId = review.assignedResolverUserId ?? null;

  if (!claimantUserId) {
    throw new ResolverQueueClaimRequiredError(
      'Claim the resolver queue item before applying a resolver action.',
    );
  }

  if (claimantUserId !== actorUserId) {
    throw new ResolverQueueClaimConflictError(
      'Resolver queue item is already claimed by another tenant-admin resolver.',
    );
  }
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
  const actorRoles = normalizeStringList(input.actorRoles);
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
    actorRoles,
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
  const assignedResolverUserId = Object.prototype.hasOwnProperty.call(
    input,
    'assignedResolverUserId',
  )
    ? normalizeOptionalString(input.assignedResolverUserId) ?? null
    : currentReview.assignedResolverUserId ?? null;
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

const loadPersonRebindService = (): Pick<
  import('../connectshyft/personRebind').PersonRebindService,
  'rebindPersonThreads' | 'enqueueRebindReview' | 'getRebindReviewContext'
> => {
  // Keep the ConnectShyft dependency lazy so the existing service singleton can stay the owner.
  const { personRebindServiceAsync } = require('../connectshyft/personRebind') as typeof import('../connectshyft/personRebind');
  return personRebindServiceAsync;
};

const loadAmbiguityEventService = (): Pick<
  typeof import('../connectshyft/ambiguityEvents'),
  'consumeAmbiguityEventsForResolverOutcome'
> => {
  const ambiguityEvents = require('../connectshyft/ambiguityEvents') as typeof import('../connectshyft/ambiguityEvents');
  return ambiguityEvents;
};

const buildResolverDecisionResult = (input: {
  review: ResolverReview;
  action: ResolverActionType;
  affectedPersonIds?: string[];
  affectedContactPointIds?: string[];
  ambiguityEventIds?: string[];
  mergeApplied: boolean;
  rebindTriggered: boolean;
}): ResolverDecisionResult => ({
  reviewId: input.review.id,
  status: deriveResolverDecisionStatus(input.review.reviewStatus)
    ?? (input.action === 'dismiss_no_action' ? 'dismissed' : 'resolved'),
  action: input.action,
  reviewStatus: input.review.reviewStatus,
  resolutionType: input.review.resolutionType ?? input.action,
  affectedPersonIds: uniqueStrings(input.affectedPersonIds ?? []),
  affectedContactPointIds: uniqueStrings(input.affectedContactPointIds ?? []),
  ambiguityEventIds: uniqueStrings(input.ambiguityEventIds ?? []),
  mergeApplied: input.mergeApplied,
  rebindTriggered: input.rebindTriggered,
});

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

  private async buildResolverQueueItemDetail(
    review: ResolverReview,
    actorUserId: string,
  ): Promise<ConnectShyftResolverQueueDetailData> {
    const rebindReview = isQueueBackedRebindReview(review)
      ? await loadPersonRebindService().getRebindReviewContext({
        tenantId: review.tenantId,
        rebindHistoryId: review.triggerSourceId,
      })
      : null;

    return {
      item: toResolverQueueItem(review, actorUserId),
      review: toResolverReviewRecord(review),
      rebindReview,
    };
  }

  private async enqueueRebindReview(input: {
    tenantId: string;
    orgUnitId: string;
    provisionalPersonId: string;
    canonicalPersonId: string;
    performedByUserId: string;
    affectedObjectIds: string[];
    contactPointIds: string[];
    originatingResolverReviewId?: string;
    originatingResolutionType?: ResolverActionType | null;
  }): Promise<void> {
    const affectedObjectIds = uniqueStrings(input.affectedObjectIds);
    if (affectedObjectIds.length === 0) {
      return;
    }

    const rebindHistory = await loadPersonRebindService().enqueueRebindReview({
      tenantId: input.tenantId,
      orgUnitId: input.orgUnitId,
      provisionalPersonId: input.provisionalPersonId,
      canonicalPersonId: input.canonicalPersonId,
      performedByUserId: input.performedByUserId,
      affectedObjectType: 'contact_point_link',
      affectedObjectIds,
      contactPointIds: uniqueStrings(input.contactPointIds),
      originatingResolverReviewId: input.originatingResolverReviewId ?? null,
      originatingResolutionType: input.originatingResolutionType ?? null,
    });
    const reviewId = buildRebindReviewResolverReviewId(rebindHistory.id);
    const existingReview = await this.store.getResolverReview({
      tenantId: input.tenantId,
      reviewId,
    });

    if (existingReview) {
      return;
    }

    const rebindReview = rebindHistory.reviewContext;
    const contactPointCount = rebindReview?.contactPointIds.length ?? 0;
    const affectedCount = rebindReview?.affectedObjectIds.length ?? affectedObjectIds.length;
    const confidenceReasons = [
      contactPointCount > 1
        ? `${contactPointCount} contact points require manual subject reassignment review.`
        : 'Manual subject reassignment review is required before finalizing contact-point truth.',
      affectedCount > 1
        ? `${affectedCount} current contact-point links remain review-class rebind work.`
        : 'A current contact-point link remains review-class rebind work.',
    ];

    try {
      await this.createResolverReview({
        reviewId,
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        reviewType: 'subject_reassignment_review',
        reviewStatus: 'queued',
        priority: 'normal',
        triggerSourceType: CONNECTSHYFT_REBIND_REVIEW_TRIGGER_SOURCE_TYPE,
        triggerSourceId: rebindHistory.id,
        provisionalPersonId: input.provisionalPersonId,
        candidatePersonIds: [input.canonicalPersonId],
        contactPointId: rebindReview?.contactPointIds[0] ?? undefined,
        confidenceBand: 'medium',
        confidenceReasons,
        riskFlags: [],
        requestedByUserId: input.performedByUserId,
        requestedAt: rebindHistory.createdAtUtc,
      });
    } catch (error) {
      if (isUniqueViolationError(error)) {
        return;
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

    if (result.reviewContactPointLinkIds.length > 0) {
      const provisionalLinks = await this.listContactPointLinks({
        tenantId: input.tenantId,
        subjectType: 'person',
        subjectId: result.mergedProvisionalPersonId,
        isCurrent: true,
      });
      const reviewLinks = provisionalLinks.filter((link) =>
        result.reviewContactPointLinkIds.includes(link.id));

      await this.enqueueRebindReview({
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId,
        provisionalPersonId: result.mergedProvisionalPersonId,
        canonicalPersonId: result.canonicalPersonId,
        performedByUserId: input.performedByUserId,
        affectedObjectIds: reviewLinks.length > 0
          ? reviewLinks.map((link) => link.id)
          : result.reviewContactPointLinkIds,
        contactPointIds: reviewLinks.map((link) => link.contactPointId),
        originatingResolverReviewId: result.resolverReviewId,
        originatingResolutionType: 'merge_people',
      });
    }

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

  listResolverQueue(input: ListResolverQueueInput) {
    return this.execute(async () => {
      const tenantId = requireNormalizedString(
        input.tenantId,
        'tenantId',
        'tenantId is required.',
      );
      const actorUserId = requireNormalizedString(
        input.actorUserId,
        'actorUserId',
        'actorUserId is required.',
      );
      const actorRoles = normalizeStringList(input.actorRoles);
      assertTenantAdminResolverActor(actorRoles);

      const reviews = await this.store.listResolverReviews({
        tenantId,
        orgUnitId: normalizeOptionalString(input.orgUnitId),
      });
      const requestedStatus = normalizeOptionalString(input.status) as ResolverReviewStatus | undefined;
      const includeTerminal = input.includeTerminal === true;

      return reviews
        .map((review) => toResolverQueueItem(review, actorUserId))
        .filter((item) => {
          if (input.itemType && item.itemType !== input.itemType) {
            return false;
          }

          if (requestedStatus && item.status !== requestedStatus) {
            return false;
          }

          if (!includeTerminal && !item.active) {
            return false;
          }

          return true;
        });
    });
  }

  getResolverQueueItemDetail(input: ResolverQueueItemLocatorInput): Promise<ConnectShyftResolverQueueDetailData | null> {
    return this.execute(async () => {
      const tenantId = requireNormalizedString(
        input.tenantId,
        'tenantId',
        'tenantId is required.',
      );
      const itemId = requireNormalizedString(
        input.itemId,
        'itemId',
        'itemId is required.',
      );
      const actorUserId = requireNormalizedString(
        input.actorUserId,
        'actorUserId',
        'actorUserId is required.',
      );
      const actorRoles = normalizeStringList(input.actorRoles);
      assertTenantAdminResolverActor(actorRoles);

      const review = await this.store.getResolverReview({
        tenantId,
        reviewId: itemId,
      });

      if (!review || resolveResolverQueueItemType(review) !== input.itemType) {
        return null;
      }

      return this.buildResolverQueueItemDetail(review, actorUserId);
    });
  }

  claimResolverQueueItem(input: ResolverQueueItemLocatorInput): Promise<ConnectShyftResolverQueueDetailData> {
    return this.execute(async () => {
      const tenantId = requireNormalizedString(
        input.tenantId,
        'tenantId',
        'tenantId is required.',
      );
      const itemId = requireNormalizedString(
        input.itemId,
        'itemId',
        'itemId is required.',
      );
      const actorUserId = requireNormalizedString(
        input.actorUserId,
        'actorUserId',
        'actorUserId is required.',
      );
      const actorRoles = normalizeStringList(input.actorRoles);
      assertTenantAdminResolverActor(actorRoles);

      const review = await this.store.getResolverReview({
        tenantId,
        reviewId: itemId,
      });

      if (!review) {
        throw new PeopleCoreScopeViolationError(
          `Resolver review ${itemId} is not available in tenant ${tenantId}.`,
        );
      }

      if (resolveResolverQueueItemType(review) !== input.itemType) {
        throw new PeopleCoreScopeViolationError(
          `Resolver queue item ${input.itemType}:${itemId} is not available in tenant ${tenantId}.`,
        );
      }

      if (isResolverReviewTerminalStatus(review.reviewStatus)) {
        throw new InvalidResolverReviewTransitionError(
          `Resolver review ${review.id} is already terminal and cannot be claimed.`,
          [
            buildFieldError(
              'reviewStatus',
              'INVALID',
              `reviewStatus ${review.reviewStatus} is terminal and cannot be claimed.`,
            ),
          ],
        );
      }

      if (review.assignedResolverUserId && review.assignedResolverUserId !== actorUserId) {
        throw new ResolverQueueClaimConflictError(
          'Resolver queue item is already claimed by another tenant-admin resolver.',
        );
      }

      const nextStatus = review.reviewStatus === 'waiting_for_more_info'
        ? 'waiting_for_more_info'
        : 'in_review';
      const updatedReview = review.assignedResolverUserId === actorUserId
        && review.reviewStatus === nextStatus
        ? review
        : await this.updateResolverReview({
          tenantId,
          reviewId: review.id,
          reviewStatus: nextStatus,
          assignedResolverUserId: actorUserId,
          startedAt: review.startedAt ?? nowIsoUtc(),
        });

      return this.buildResolverQueueItemDetail(updatedReview, actorUserId);
    });
  }

  releaseResolverQueueItem(input: ResolverQueueItemLocatorInput): Promise<ConnectShyftResolverQueueDetailData> {
    return this.execute(async () => {
      const tenantId = requireNormalizedString(
        input.tenantId,
        'tenantId',
        'tenantId is required.',
      );
      const itemId = requireNormalizedString(
        input.itemId,
        'itemId',
        'itemId is required.',
      );
      const actorUserId = requireNormalizedString(
        input.actorUserId,
        'actorUserId',
        'actorUserId is required.',
      );
      const actorRoles = normalizeStringList(input.actorRoles);
      assertTenantAdminResolverActor(actorRoles);

      const review = await this.store.getResolverReview({
        tenantId,
        reviewId: itemId,
      });

      if (!review) {
        throw new PeopleCoreScopeViolationError(
          `Resolver review ${itemId} is not available in tenant ${tenantId}.`,
        );
      }

      if (resolveResolverQueueItemType(review) !== input.itemType) {
        throw new PeopleCoreScopeViolationError(
          `Resolver queue item ${input.itemType}:${itemId} is not available in tenant ${tenantId}.`,
        );
      }

      if (!isResolverReviewActiveStatus(review.reviewStatus)) {
        throw new InvalidResolverReviewTransitionError(
          `Resolver review ${review.id} is already terminal and cannot be released.`,
          [
            buildFieldError(
              'reviewStatus',
              'INVALID',
              `reviewStatus ${review.reviewStatus} is terminal and cannot be released.`,
            ),
          ],
        );
      }

      if (!review.assignedResolverUserId) {
        throw new ResolverQueueClaimRequiredError(
          'Resolver queue item is not currently claimed by the acting resolver.',
        );
      }

      if (review.assignedResolverUserId !== actorUserId) {
        throw new ResolverQueueClaimConflictError(
          'Only the current claimant may release this resolver queue item.',
        );
      }

      const updatedReview = await this.updateResolverReview({
        tenantId,
        reviewId: review.id,
        reviewStatus: 'queued',
        assignedResolverUserId: null,
      });

      return this.buildResolverQueueItemDetail(updatedReview, actorUserId);
    });
  }

  private async consumeLinkedAmbiguityEvents(input: {
    review: ResolverReview;
    action: ResolverActionType;
    actorUserId: string;
    reviewStatus: ResolverReviewStatus;
    resolvedAtUtc: string;
    reason?: string;
    notes?: string;
    personId?: string;
    sourcePersonId?: string;
    targetPersonId?: string;
    contactPointId?: string;
    ambiguityEventId?: string;
  }): Promise<string[]> {
    const outcome = input.reviewStatus === 'dismissed' ? 'dismissed' : 'resolved';
    const consumed = await loadAmbiguityEventService().consumeAmbiguityEventsForResolverOutcome({
      tenantId: input.review.tenantId,
      resolverReviewId: input.review.id,
      triggerSourceId: input.review.triggerSourceId,
      ambiguityEventId: input.ambiguityEventId,
      outcome,
      consumedByUserId: input.actorUserId,
      consumedAtUtc: input.resolvedAtUtc,
      resolverOutcome: {
        reviewId: input.review.id,
        action: input.action,
        reviewStatus: input.reviewStatus,
        actorUserId: input.actorUserId,
        occurredAtUtc: input.resolvedAtUtc,
        reason: input.reason ?? input.review.resolutionReason ?? null,
        notes: input.notes ?? input.review.resolutionNotes ?? null,
        personId: input.personId ?? null,
        sourcePersonId: input.sourcePersonId ?? null,
        targetPersonId: input.targetPersonId ?? null,
        contactPointId: input.contactPointId ?? input.review.contactPointId ?? null,
      },
    });

    return uniqueStrings(consumed.events.map((event) => event.id));
  }

  applyResolverDecision(input: ResolverDecisionInput): Promise<ResolverDecisionResult> {
    return this.execute(async () => {
      const validated = validateResolverDecisionInput(input);
      assertTenantAdminResolverActor(validated.actorRoles);
      const review = await this.store.getResolverReview({
        tenantId: validated.tenantId,
        reviewId: validated.reviewId,
      });

      if (!review) {
        throw new PeopleCoreScopeViolationError(
          `Resolver review ${validated.reviewId} is not available in tenant ${validated.tenantId}.`,
        );
      }

      if (isQueueBackedRebindReview(review)) {
        throw new ResolverReviewValidationError(
          'Rebind-review queue work is not processed through identity resolver actions.',
          [
            buildFieldError(
              'reviewId',
              'CONFLICT',
              'Use the rebind-review workflow to resolve subject reassignment queue work.',
            ),
          ],
        );
      }

      assertResolverReviewClaimedByActor(review, validated.actorUserId);

      const targetReviewStatus = RESOLVER_ACTION_STATUS_MAP[validated.action];
      if (isResolverReviewTerminalStatus(review.reviewStatus)) {
        assertTerminalReviewMutationAllowed(review, {
          tenantId: validated.tenantId,
          reviewId: validated.reviewId,
          reviewStatus: targetReviewStatus,
          assignedResolverUserId: validated.actorUserId,
          resolutionType: validated.action,
          resolutionReason: validated.reason,
          resolutionNotes: validated.notes,
        });

        const replayAffectedPersonIds: Array<string | undefined> = [
          review.provisionalPersonId,
          ...review.candidatePersonIds,
          validated.personId,
          validated.sourcePersonId,
          validated.targetPersonId,
        ];
        const replayAffectedContactPointIds: Array<string | undefined> = [
          validated.contactPointId,
          review.contactPointId,
        ];
        const replayAmbiguityEventIds = await this.consumeLinkedAmbiguityEvents({
          review,
          action: validated.action,
          actorUserId: validated.actorUserId,
          reviewStatus: review.reviewStatus,
          resolvedAtUtc: review.resolvedAt ?? nowIsoUtc(),
          reason: validated.reason,
          notes: validated.notes,
          personId: validated.personId,
          sourcePersonId: validated.sourcePersonId,
          targetPersonId: validated.targetPersonId,
          contactPointId: validated.contactPointId,
          ambiguityEventId: validated.ambiguityEventId,
        });

        return buildResolverDecisionResult({
          review,
          action: validated.action,
          affectedPersonIds: uniqueStrings(replayAffectedPersonIds),
          affectedContactPointIds: uniqueStrings(replayAffectedContactPointIds),
          ambiguityEventIds: replayAmbiguityEventIds,
          mergeApplied: validated.action === 'merge_people',
          rebindTriggered: false,
        });
      }

      if (
        validated.action === 'confirm_new_person'
        && review.provisionalPersonId
        && review.provisionalPersonId !== validated.personId
      ) {
        throw new ResolverReviewValidationError(
          'confirm_new_person must resolve to the review provisionalPersonId.',
          [
            buildFieldError(
              'personId',
              'CONFLICT',
              'personId must match the resolver review provisionalPersonId for confirm_new_person.',
            ),
          ],
        );
      }

      if (
        validated.action === 'confirm_existing_person'
        && review.provisionalPersonId
        && review.provisionalPersonId === validated.personId
      ) {
        throw new ResolverReviewValidationError(
          'confirm_existing_person cannot target the review provisionalPersonId.',
          [
            buildFieldError(
              'personId',
              'CONFLICT',
              'confirm_existing_person must target an existing person distinct from provisionalPersonId.',
            ),
          ],
        );
      }

      let affectedPersonIds = uniqueStrings([
        review.provisionalPersonId,
        ...review.candidatePersonIds,
        validated.personId,
        validated.sourcePersonId,
        validated.targetPersonId,
      ]);
      let affectedContactPointIds = uniqueStrings([validated.contactPointId, review.contactPointId]);
      let ambiguityEventIds: string[] = [];
      let mergeApplied = false;
      let rebindTriggered = false;

      switch (validated.action) {
        case 'confirm_existing_person':
        case 'confirm_new_person':
        case 'link_without_merge':
        case 'mark_shared_contact':
        case 'reassign_contact_point': {
          const contactPointId = validated.contactPointId ?? review.contactPointId;
          if (!contactPointId) {
            throw new ResolverReviewValidationError(
              `${validated.action} requires a resolver review with contactPointId.`,
              [
                buildFieldError(
                  'contactPointId',
                  'REQUIRED',
                  `contactPointId is required for ${validated.action}.`,
                ),
              ],
            );
          }

          const currentPersonLinks = await this.store.listCurrentContactPointLinks({
            tenantId: validated.tenantId,
            contactPointId,
            subjectType: 'person',
          });
          const currentPersonIds = uniqueStrings(currentPersonLinks.map((link) => link.subjectId));
          const targetPersonIds = validated.action === 'mark_shared_contact'
            ? uniqueStrings([
              ...currentPersonIds,
              review.provisionalPersonId,
              ...review.candidatePersonIds,
            ])
            : uniqueStrings([validated.personId]);

          if (validated.action === 'mark_shared_contact' && targetPersonIds.length < 2) {
            throw new ResolverReviewValidationError(
              'mark_shared_contact requires at least two people in the review context.',
              [
                buildFieldError(
                  'reviewId',
                  'CONFLICT',
                  'mark_shared_contact requires at least two people in the resolver review context.',
                ),
              ],
            );
          }

          const primaryPersonId = validated.action === 'mark_shared_contact'
            ? currentPersonIds[0] ?? targetPersonIds[0]
            : validated.personId!;

          const updatedLinks = await this.store.setResolverContactPointPersons({
            tenantId: validated.tenantId,
            contactPointId,
            personIds: targetPersonIds,
            primaryPersonId,
            performedByUserId: validated.actorUserId,
            resolutionType: validated.action,
          });

          if (validated.action === 'mark_shared_contact') {
            await this.store.appendContactPointEvent({
              tenantId: validated.tenantId,
              contactPointId,
              eventType: 'shared_detected',
              eventSource: 'peoplecore.resolver',
              relatedObjectType: 'resolver_review',
              relatedObjectId: review.id,
            });
            await this.recomputeContactPointLifecycle({
              tenantId: validated.tenantId,
              contactPointId,
            });
          }

          const nextCurrentPersonIds = uniqueStrings(updatedLinks.map((link) => link.subjectId));
          affectedPersonIds = uniqueStrings([
            ...affectedPersonIds,
            ...currentPersonIds,
            ...nextCurrentPersonIds,
          ]);
          affectedContactPointIds = uniqueStrings([...affectedContactPointIds, contactPointId]);

          if (
            (validated.action === 'confirm_existing_person'
              || validated.action === 'confirm_new_person'
              || validated.action === 'reassign_contact_point')
            && currentPersonIds.length === 1
            && nextCurrentPersonIds.length === 1
            && currentPersonIds[0] !== nextCurrentPersonIds[0]
          ) {
            await loadPersonRebindService().rebindPersonThreads({
              tenantId: validated.tenantId,
              orgUnitId: review.orgUnitId,
              provisionalPersonId: currentPersonIds[0]!,
              canonicalPersonId: nextCurrentPersonIds[0]!,
              performedByUserId: validated.actorUserId,
            });
            rebindTriggered = true;
          }

          break;
        }
        case 'merge_people': {
          const merged = await this.mergePerson({
            tenantId: validated.tenantId,
            orgUnitId: review.orgUnitId,
            provisionalPersonId: validated.sourcePersonId!,
            canonicalPersonId: validated.targetPersonId!,
            performedByUserId: validated.actorUserId,
            mergeReason: validated.reason,
            resolverReviewId: review.id,
            skipResolverReviewCreation: true,
          });
          mergeApplied = merged.didPersistMerge !== false;
          if (mergeApplied && merged.reviewContactPointLinkIds.length === 0) {
            await loadPersonRebindService().rebindPersonThreads({
              tenantId: validated.tenantId,
              orgUnitId: review.orgUnitId,
              provisionalPersonId: validated.sourcePersonId!,
              canonicalPersonId: validated.targetPersonId!,
              performedByUserId: validated.actorUserId,
            });
            rebindTriggered = true;
          }
          break;
        }
        case 'dismiss_no_action':
          break;
        default: {
          const exhaustiveAction: never = validated.action;
          throw new ResolverReviewValidationError(
            `Unsupported resolver action: ${String(exhaustiveAction)}.`,
          );
        }
      }

      const updatedReview = await this.updateResolverReview({
        tenantId: validated.tenantId,
        reviewId: validated.reviewId,
        reviewStatus: targetReviewStatus,
        assignedResolverUserId: validated.actorUserId,
        resolutionType: validated.action,
        resolutionReason: validated.reason,
        resolutionNotes: validated.notes,
        resolvedAt: nowIsoUtc(),
      });

      ambiguityEventIds = await this.consumeLinkedAmbiguityEvents({
        review: updatedReview,
        action: validated.action,
        actorUserId: validated.actorUserId,
        reviewStatus: updatedReview.reviewStatus,
        resolvedAtUtc: updatedReview.resolvedAt ?? nowIsoUtc(),
        reason: validated.reason,
        notes: validated.notes,
        personId: validated.personId,
        sourcePersonId: validated.sourcePersonId,
        targetPersonId: validated.targetPersonId,
        contactPointId: validated.contactPointId,
        ambiguityEventId: validated.ambiguityEventId,
      });

      return buildResolverDecisionResult({
        review: updatedReview,
        action: validated.action,
        affectedPersonIds,
        affectedContactPointIds,
        ambiguityEventIds,
        mergeApplied,
        rebindTriggered,
      });
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
