import {
  RESOLVER_ACTION_STATUS_MAP,
  RESOLVER_ACTION_TYPES,
} from '@shyft/contracts';
import {
  createIdentityAmbiguityEvent,
  getIdentityAmbiguityEvent,
  resetIdentityAmbiguityEventsForTests,
} from '../../connectshyft/ambiguityEvents';
import {
  AsyncPeopleCoreService,
  assertResolverReviewTransitionAllowed,
  ContactPointLifecycleComputationError,
  InvalidResolverReviewTransitionError,
  PeopleCorePersistenceUnavailableError,
  ResolverReviewValidationError,
  validateResolverDecisionInput,
} from '../service';
import type { CreateResolverReviewInput } from '../store';
import { personRebindServiceAsync } from '../../connectshyft/personRebind';

const PERSON_INPUT = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'active_confirmed' as const,
};

const HOUSEHOLD_INPUT = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  name: 'Lovelace Home',
  status: 'active' as const,
};

const CONTACT_POINT_INPUT = {
  tenantId: 'tenant-1',
  type: 'phone' as const,
  normalizedValue: '+12605551212',
  status: 'active_personal' as const,
  firstSeenAt: '2026-03-21T12:00:00.000Z',
  lastSeenAt: '2026-03-21T12:00:00.000Z',
  suspectedShared: false,
  confirmedShared: false,
  reassignmentSuspected: false,
};

const RESOLVER_REVIEW_INPUT: CreateResolverReviewInput = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  reviewType: 'identity_conflict' as const,
  reviewStatus: 'pending' as const,
  priority: 'normal' as const,
  triggerSourceType: 'conversation',
  triggerSourceId: 'conversation-1',
  candidatePersonIds: ['person-a'],
  confidenceBand: 'high' as const,
  confidenceReasons: ['exact phone match'],
  riskFlags: ['duplicate_creation_attempt'],
  requestedByUserId: 'user-1',
  requestedAt: '2026-03-21T12:00:00.000Z',
};

const BASE_RESOLVER_REVIEW = {
  id: 'review-1',
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  reviewType: 'identity_conflict' as const,
  reviewStatus: 'pending' as const,
  priority: 'normal' as const,
  triggerSourceType: 'conversation',
  triggerSourceId: 'conversation-1',
  candidatePersonIds: ['person-a', 'person-b'],
  confidenceBand: 'high' as const,
  confidenceReasons: ['exact phone match'],
  riskFlags: ['duplicate_creation_attempt'] as const,
  requestedByUserId: 'user-1',
  requestedAt: '2026-03-21T12:00:00.000Z',
};

const buildResolverReview = (overrides: Record<string, unknown> = {}) => ({
  ...BASE_RESOLVER_REVIEW,
  ...overrides,
});

const CONTACT_POINT_LINK_BASE = {
  tenantId: 'tenant-1',
  contactPointId: 'contact-point-1',
  subjectType: 'person' as const,
  linkType: 'primary' as const,
  confidenceBand: 'high' as const,
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: true,
  confirmationSource: 'resolver' as const,
  firstLinkedAt: '2026-03-21T12:00:00.000Z',
  linkedBy: 'resolver' as const,
  createdAt: '2026-03-21T12:00:00.000Z',
  updatedAt: '2026-03-21T12:00:00.000Z',
};

const buildContactPointLink = (subjectId: string, overrides: Record<string, unknown> = {}) => ({
  ...CONTACT_POINT_LINK_BASE,
  id: `link-${subjectId}`,
  subjectId,
  ...overrides,
});

const buildDecisionReview = (overrides: Record<string, unknown> = {}) => buildResolverReview({
  contactPointId: 'contact-point-1',
  provisionalPersonId: 'person-provisional',
  candidatePersonIds: ['person-existing'],
  ...overrides,
});

const buildResolvedReviewForAction = (
  action: keyof typeof RESOLVER_ACTION_STATUS_MAP,
  overrides: Record<string, unknown> = {},
) => buildDecisionReview({
  reviewStatus: RESOLVER_ACTION_STATUS_MAP[action],
  resolutionType: action,
  resolutionReason: 'Resolver decision applied.',
  resolvedAt: '2026-03-21T12:12:00.000Z',
  assignedResolverUserId: 'resolver-1',
  ...overrides,
});

const createApplyResolverDecisionStore = (overrides: Record<string, jest.Mock> = {}) => ({
  getResolverReview: jest.fn(),
  listCurrentContactPointLinks: jest.fn(),
  setResolverContactPointPersons: jest.fn(),
  updateResolverReview: jest.fn(),
  appendContactPointEvent: jest.fn(),
  getContactPoint: jest.fn(),
  listContactPointEvents: jest.fn(),
  updateContactPointStatus: jest.fn(),
  mergePerson: jest.fn(),
  ...overrides,
});

describe('AsyncPeopleCoreService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetIdentityAmbiguityEventsForTests();
  });

  it('delegates persistence-backed operations to the configured store', async () => {
    const store = {
      createPerson: jest.fn(async () => ({ id: 'person-1' })),
      getHousehold: jest.fn(async () => ({ id: 'household-1' })),
      listHouseholdMemberships: jest.fn(async () => [{ id: 'membership-1' }]),
      createContactPoint: jest.fn(async () => ({ id: 'contact-point-1' })),
      listCurrentContactPointLinks: jest.fn(async () => []),
      getContactPoint: jest.fn(async () => ({ id: 'cp-1', status: 'active_personal' })),
      createContactPointLink: jest.fn(async () => ({ id: 'link-1' })),
      appendContactPointEvent: jest.fn(async () => ({ id: 'event-1' })),
      updateContactPointStatus: jest.fn(async () => undefined),
      listContactPointEvents: jest.fn(async () => []),
      getResolverReview: jest.fn(async () => ({ id: 'review-1' })),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.createPerson(PERSON_INPUT)).resolves.toEqual({ id: 'person-1' });
    await expect(service.getHousehold({ tenantId: 'tenant-1', householdId: 'household-1' }))
      .resolves.toEqual({ id: 'household-1' });
    await expect(service.listHouseholdMemberships({ tenantId: 'tenant-1' }))
      .resolves.toEqual([{ id: 'membership-1' }]);
    await expect(service.createContactPoint(CONTACT_POINT_INPUT))
      .resolves.toEqual({ id: 'contact-point-1' });
    await expect(service.listCurrentContactPointLinks({ tenantId: 'tenant-1', contactPointId: 'cp-1' }))
      .resolves.toEqual([]);
    await expect(service.createContactPointLink({
      tenantId: 'tenant-1',
      contactPointId: 'cp-1',
      subjectType: 'person',
      subjectId: 'person-1',
      linkType: 'primary',
      confidenceBand: 'high',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: false,
      firstLinkedAt: '2026-03-21T12:00:00.000Z',
      linkedBy: 'system',
    })).resolves.toEqual({ id: 'link-1' });
    await expect(service.appendContactPointEvent({
      tenantId: 'tenant-1',
      contactPointId: 'cp-1',
      eventType: 'inbound_seen',
      eventSource: 'peoplecore',
    })).resolves.toEqual({ id: 'event-1' });
    await expect(service.getResolverReview({ tenantId: 'tenant-1', reviewId: 'review-1' }))
      .resolves.toEqual({ id: 'review-1' });
  });

  it('wraps lifecycle recomputation failures after event capture', async () => {
    const store = {
      appendContactPointEvent: jest.fn(async () => ({ id: 'event-1' })),
      getContactPoint: jest.fn(async () => ({ id: 'cp-1', status: 'active_personal' })),
      listContactPointEvents: jest.fn(async () => {
        throw new Error('db read failed');
      }),
      listCurrentContactPointLinks: jest.fn(async () => []),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.appendContactPointEvent({
      tenantId: 'tenant-1',
      contactPointId: 'cp-1',
      eventType: 'inbound_seen',
      eventSource: 'peoplecore',
    })).rejects.toBeInstanceOf(ContactPointLifecycleComputationError);
  });

  it.each([
    ['createPerson', (service: AsyncPeopleCoreService) => service.createPerson(PERSON_INPUT), 'createPerson'],
    ['getPerson', (service: AsyncPeopleCoreService) => service.getPerson({ tenantId: 'tenant-1', personId: 'person-1' }), 'getPerson'],
    ['listPersons', (service: AsyncPeopleCoreService) => service.listPersons({ tenantId: 'tenant-1' }), 'listPersons'],
    ['createHousehold', (service: AsyncPeopleCoreService) => service.createHousehold(HOUSEHOLD_INPUT), 'createHousehold'],
    ['getHousehold', (service: AsyncPeopleCoreService) => service.getHousehold({ tenantId: 'tenant-1', householdId: 'household-1' }), 'getHousehold'],
    ['createHouseholdMembership', (service: AsyncPeopleCoreService) => service.createHouseholdMembership({
      tenantId: 'tenant-1',
      householdId: 'household-1',
      personId: 'person-1',
      role: 'head',
      isCurrent: true,
    }), 'createHouseholdMembership'],
    ['listHouseholdMemberships', (service: AsyncPeopleCoreService) => service.listHouseholdMemberships({ tenantId: 'tenant-1' }), 'listHouseholdMemberships'],
    ['createContactPoint', (service: AsyncPeopleCoreService) => service.createContactPoint(CONTACT_POINT_INPUT), 'createContactPoint'],
    ['getContactPoint', (service: AsyncPeopleCoreService) => service.getContactPoint({ tenantId: 'tenant-1', contactPointId: 'cp-1' }), 'getContactPoint'],
    ['listContactPointsByNormalizedValue', (service: AsyncPeopleCoreService) => service.listContactPointsByNormalizedValue({
      tenantId: 'tenant-1',
      type: 'phone',
      normalizedValue: '+12605551212',
    }), 'listContactPointsByNormalizedValue'],
    ['createContactPointLink', (service: AsyncPeopleCoreService) => service.createContactPointLink({
      tenantId: 'tenant-1',
      contactPointId: 'cp-1',
      subjectType: 'person',
      subjectId: 'person-1',
      linkType: 'primary',
      confidenceBand: 'high',
      isCurrent: true,
      isPrimary: true,
      manuallyConfirmed: false,
      firstLinkedAt: '2026-03-21T12:00:00.000Z',
      linkedBy: 'system',
    }), 'createContactPointLink'],
    ['listCurrentContactPointLinks', (service: AsyncPeopleCoreService) => service.listCurrentContactPointLinks({ tenantId: 'tenant-1' }), 'listCurrentContactPointLinks'],
    ['appendContactPointEvent', (service: AsyncPeopleCoreService) => service.appendContactPointEvent({
      tenantId: 'tenant-1',
      contactPointId: 'cp-1',
      eventType: 'inbound_seen',
      eventSource: 'peoplecore',
    }), 'appendContactPointEvent'],
    ['listContactPointEvents', (service: AsyncPeopleCoreService) => service.listContactPointEvents({ tenantId: 'tenant-1', contactPointId: 'cp-1' }), 'listContactPointEvents'],
    ['createResolverReview', (service: AsyncPeopleCoreService) => service.createResolverReview(RESOLVER_REVIEW_INPUT), 'createResolverReview'],
    ['getResolverReview', (service: AsyncPeopleCoreService) => service.getResolverReview({ tenantId: 'tenant-1', reviewId: 'review-1' }), 'getResolverReview'],
    ['listResolverReviews', (service: AsyncPeopleCoreService) => service.listResolverReviews({ tenantId: 'tenant-1' }), 'listResolverReviews'],
  ])('wraps missing persistence for %s', async (_name, invoke, methodName) => {
    const missingTableError = Object.assign(
      new Error('relation "people.peoplecore" does not exist'),
      { code: '42P01' },
    );
    const store = {
      [methodName]: jest.fn(async () => {
        throw missingTableError;
      }),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(invoke(service)).rejects.toBeInstanceOf(PeopleCorePersistenceUnavailableError);
  });

  it.each(RESOLVER_ACTION_TYPES)('accepts canonical resolver decision action %s', (action) => {
    expect(validateResolverDecisionInput({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action,
      ...(action === 'confirm_existing_person' ? { personId: 'person-1' } : {}),
      ...(action === 'confirm_new_person' ? { provisionalPersonId: 'person-provisional' } : {}),
      ...(action === 'merge_people'
        ? { sourcePersonId: 'person-source', targetPersonId: 'person-target' }
        : {}),
      ...(action === 'link_without_merge' ? { personId: 'person-1' } : {}),
      ...(action === 'reassign_contact_point'
        ? { personId: 'person-1', contactPointId: 'contact-point-1' }
        : {}),
      ...(action === 'dismiss_no_action' ? { reason: 'No identity change required.' } : {}),
    }).action).toBe(action);
  });

  it('rejects unknown resolver decision actions', () => {
    expect(() => validateResolverDecisionInput({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'maybe_merge_later' as any,
    })).toThrow(ResolverReviewValidationError);
  });

  it.each([
    ['pending', 'in_review'],
    ['pending', 'resolved_confirmed_existing'],
    ['queued', 'in_review'],
    ['in_review', 'resolved_merged'],
    ['waiting_for_more_info', 'dismissed'],
  ] as const)('allows resolver review transition %s -> %s', (currentStatus, nextStatus) => {
    expect(() => assertResolverReviewTransitionAllowed(currentStatus, nextStatus)).not.toThrow();
  });

  it.each([
    ['resolved_confirmed_existing', 'in_review'],
    ['dismissed', 'resolved_confirmed_existing'],
    ['pending', 'pending'],
    ['pending', 'waiting_for_more_info'],
  ] as const)('rejects invalid resolver review transition %s -> %s when appropriate', (currentStatus, nextStatus) => {
    if (currentStatus === 'pending' && nextStatus === 'pending') {
      expect(() => assertResolverReviewTransitionAllowed(currentStatus, nextStatus)).not.toThrow();
      return;
    }

    expect(() => assertResolverReviewTransitionAllowed(currentStatus, nextStatus))
      .toThrow(InvalidResolverReviewTransitionError);
  });

  it('rejects merge_people when source and target match', () => {
    expect(() => validateResolverDecisionInput({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'merge_people',
      sourcePersonId: 'person-1',
      targetPersonId: 'person-1',
    })).toThrow(ResolverReviewValidationError);
  });

  it('requires a reason for dismiss_no_action', () => {
    expect(() => validateResolverDecisionInput({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'dismiss_no_action',
    })).toThrow(ResolverReviewValidationError);
  });

  it('normalizes confirm_new_person from provisionalPersonId', () => {
    expect(validateResolverDecisionInput({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_new_person',
      provisionalPersonId: 'person-provisional',
    })).toMatchObject({
      personId: 'person-provisional',
      action: 'confirm_new_person',
    });
  });

  it('moves a resolver review from pending to in_review through the service lifecycle guard', async () => {
    const currentReview = buildResolverReview();
    const updatedReview = buildResolverReview({
      reviewStatus: 'in_review',
      startedAt: '2026-03-21T12:10:00.000Z',
      assignedResolverUserId: 'resolver-1',
    });
    const store = {
      getResolverReview: jest.fn(async () => currentReview),
      updateResolverReview: jest.fn(async () => updatedReview),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.updateResolverReview({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      reviewStatus: 'in_review',
      assignedResolverUserId: 'resolver-1',
      startedAt: '2026-03-21T12:10:00.000Z',
    })).resolves.toEqual(updatedReview);
    expect(store.updateResolverReview).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      reviewStatus: 'in_review',
      assignedResolverUserId: 'resolver-1',
      startedAt: '2026-03-21T12:10:00.000Z',
      resolvedAt: null,
      resolutionType: null,
    }));
  });

  it('moves a resolver review to a valid terminal resolution state', async () => {
    const currentReview = buildResolverReview({
      reviewStatus: 'in_review',
      startedAt: '2026-03-21T12:10:00.000Z',
      assignedResolverUserId: 'resolver-1',
    });
    const updatedReview = buildResolverReview({
      reviewStatus: 'resolved_confirmed_existing',
      startedAt: '2026-03-21T12:10:00.000Z',
      resolvedAt: '2026-03-21T12:12:00.000Z',
      assignedResolverUserId: 'resolver-1',
      resolutionType: 'confirm_existing_person',
      resolutionReason: 'Matched against the existing canonical person.',
    });
    const store = {
      getResolverReview: jest.fn(async () => currentReview),
      updateResolverReview: jest.fn(async () => updatedReview),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.updateResolverReview({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      reviewStatus: 'resolved_confirmed_existing',
      assignedResolverUserId: 'resolver-1',
      resolutionType: 'confirm_existing_person',
      resolutionReason: 'Matched against the existing canonical person.',
      resolvedAt: '2026-03-21T12:12:00.000Z',
    })).resolves.toEqual(updatedReview);
  });

  it('rejects changing an already resolved review to a different terminal outcome', async () => {
    const store = {
      getResolverReview: jest.fn(async () => buildResolverReview({
        reviewStatus: 'resolved_confirmed_existing',
        resolvedAt: '2026-03-21T12:12:00.000Z',
        resolutionType: 'confirm_existing_person',
        resolutionReason: 'Matched against the existing canonical person.',
      })),
      updateResolverReview: jest.fn(),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.updateResolverReview({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      reviewStatus: 'resolved_merged',
      resolutionType: 'merge_people',
      resolutionReason: 'Merge the duplicate people.',
    })).rejects.toBeInstanceOf(InvalidResolverReviewTransitionError);
    expect(store.updateResolverReview).not.toHaveBeenCalled();
  });

  it('rejects resolving a dismissed review later', async () => {
    const store = {
      getResolverReview: jest.fn(async () => buildResolverReview({
        reviewStatus: 'dismissed',
        resolvedAt: '2026-03-21T12:12:00.000Z',
        resolutionType: 'dismiss_no_action',
        resolutionReason: 'No identity change required.',
      })),
      updateResolverReview: jest.fn(),
    };
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.updateResolverReview({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      reviewStatus: 'resolved_confirmed_existing',
      resolutionType: 'confirm_existing_person',
      resolutionReason: 'Attempting to resolve after dismissal.',
    })).rejects.toBeInstanceOf(InvalidResolverReviewTransitionError);
    expect(store.updateResolverReview).not.toHaveBeenCalled();
  });

  it('applies confirm_existing_person through the authoritative decision path and triggers rebind when ownership changes', async () => {
    const currentReview = buildDecisionReview();
    const updatedReview = buildResolvedReviewForAction('confirm_existing_person', {
      candidatePersonIds: ['person-existing'],
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      setResolverContactPointPersons: jest.fn(async () => [
        buildContactPointLink('person-existing'),
      ]),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_existing_person',
      personId: 'person-existing',
      reason: 'Matched the existing person.',
    });

    expect(store.setResolverContactPointPersons).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      contactPointId: 'contact-point-1',
      personIds: ['person-existing'],
      primaryPersonId: 'person-existing',
      resolutionType: 'confirm_existing_person',
    }));
    expect(rebindSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      provisionalPersonId: 'person-provisional',
      canonicalPersonId: 'person-existing',
      performedByUserId: 'resolver-1',
    });
    expect(result).toMatchObject({
      reviewId: 'review-1',
      status: 'resolved',
      action: 'confirm_existing_person',
      reviewStatus: 'resolved_confirmed_existing',
      resolutionType: 'confirm_existing_person',
      affectedPersonIds: ['person-provisional', 'person-existing'],
      affectedContactPointIds: ['contact-point-1'],
      mergeApplied: false,
      rebindTriggered: true,
    });
  });

  it('applies confirm_new_person without invoking merge and preserves the provisional identity', async () => {
    const currentReview = buildDecisionReview();
    const updatedReview = buildResolvedReviewForAction('confirm_new_person');
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      setResolverContactPointPersons: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      updateResolverReview: jest.fn(async () => updatedReview),
      mergePerson: jest.fn(),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_new_person',
      provisionalPersonId: 'person-provisional',
      reason: 'The provisional person is correct.',
    });

    expect(store.setResolverContactPointPersons).toHaveBeenCalledWith(expect.objectContaining({
      personIds: ['person-provisional'],
      primaryPersonId: 'person-provisional',
      resolutionType: 'confirm_new_person',
    }));
    expect(store.mergePerson).not.toHaveBeenCalled();
    expect(rebindSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'confirm_new_person',
      reviewStatus: 'resolved_confirmed_new',
      resolutionType: 'confirm_new_person',
      affectedPersonIds: ['person-provisional', 'person-existing'],
      mergeApplied: false,
      rebindTriggered: false,
    });
  });

  it('applies merge_people through the existing merge path and emits merge-safe flags', async () => {
    const currentReview = buildDecisionReview({
      reviewType: 'merge_review',
      candidatePersonIds: ['person-canonical'],
    });
    const updatedReview = buildResolvedReviewForAction('merge_people', {
      reviewType: 'merge_review',
      candidatePersonIds: ['person-canonical'],
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      mergePerson: jest.fn(async () => ({
        mergedProvisionalPersonId: 'person-provisional',
        canonicalPersonId: 'person-canonical',
        autoMergedContactPointLinkIds: ['link-person-provisional'],
        reviewContactPointLinkIds: [],
        resolverReviewId: 'review-1',
        didPersistMerge: true,
      })),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const mergeEventPublisher = {
      publishPersonMerged: jest.fn(async () => undefined),
    };
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any, mergeEventPublisher as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'merge_people',
      sourcePersonId: 'person-provisional',
      targetPersonId: 'person-canonical',
      reason: 'Merge the duplicate people.',
    });

    expect(store.mergePerson).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      provisionalPersonId: 'person-provisional',
      canonicalPersonId: 'person-canonical',
      performedByUserId: 'resolver-1',
      resolverReviewId: 'review-1',
      skipResolverReviewCreation: true,
    }));
    expect(mergeEventPublisher.publishPersonMerged).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      provisionalPersonId: 'person-provisional',
      canonicalPersonId: 'person-canonical',
      resolverReviewId: 'review-1',
    }));
    expect(rebindSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      provisionalPersonId: 'person-provisional',
      canonicalPersonId: 'person-canonical',
      performedByUserId: 'resolver-1',
    });
    expect(result).toMatchObject({
      action: 'merge_people',
      reviewStatus: 'resolved_merged',
      resolutionType: 'merge_people',
      mergeApplied: true,
      rebindTriggered: true,
      affectedPersonIds: ['person-provisional', 'person-canonical'],
    });
  });

  it('applies link_without_merge without merge or broad rebind fanout', async () => {
    const currentReview = buildDecisionReview();
    const updatedReview = buildResolvedReviewForAction('link_without_merge');
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      setResolverContactPointPersons: jest.fn(async () => [
        buildContactPointLink('person-existing'),
      ]),
      updateResolverReview: jest.fn(async () => updatedReview),
      mergePerson: jest.fn(),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'link_without_merge',
      personId: 'person-existing',
      reason: 'Keep both people distinct but maintain the operational link.',
    });

    expect(store.mergePerson).not.toHaveBeenCalled();
    expect(rebindSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'link_without_merge',
      reviewStatus: 'resolved_confirmed_existing',
      resolutionType: 'link_without_merge',
      mergeApplied: false,
      rebindTriggered: false,
    });
  });

  it('applies mark_shared_contact without forcing exclusive ownership', async () => {
    const currentReview = buildDecisionReview();
    const updatedLinks = [
      buildContactPointLink('person-existing'),
      buildContactPointLink('person-provisional', {
        id: 'link-person-provisional-secondary',
        isPrimary: false,
        linkType: 'secondary',
      }),
    ];
    const updatedReview = buildResolvedReviewForAction('mark_shared_contact');
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn()
        .mockResolvedValueOnce([
          buildContactPointLink('person-existing'),
        ])
        .mockResolvedValueOnce(updatedLinks),
      setResolverContactPointPersons: jest.fn(async () => updatedLinks),
      appendContactPointEvent: jest.fn(async () => ({ id: 'event-1' })),
      getContactPoint: jest.fn(async () => ({
        id: 'contact-point-1',
        status: 'active_personal',
      })),
      listContactPointEvents: jest.fn(async () => []),
      updateContactPointStatus: jest.fn(async () => undefined),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'mark_shared_contact',
      reason: 'This phone number is intentionally shared.',
    });

    expect(store.setResolverContactPointPersons).toHaveBeenCalledWith(expect.objectContaining({
      personIds: ['person-existing', 'person-provisional'],
      primaryPersonId: 'person-existing',
      resolutionType: 'mark_shared_contact',
    }));
    expect(store.appendContactPointEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'shared_detected',
      relatedObjectId: 'review-1',
    }));
    expect(rebindSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'mark_shared_contact',
      reviewStatus: 'resolved_shared_contact',
      resolutionType: 'mark_shared_contact',
      mergeApplied: false,
      rebindTriggered: false,
      affectedPersonIds: ['person-provisional', 'person-existing'],
    });
  });

  it('applies reassign_contact_point and triggers rebind when current subject truth changes', async () => {
    const currentReview = buildDecisionReview();
    const updatedReview = buildResolvedReviewForAction('reassign_contact_point');
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      setResolverContactPointPersons: jest.fn(async () => [
        buildContactPointLink('person-existing'),
      ]),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'reassign_contact_point',
      personId: 'person-existing',
      contactPointId: 'contact-point-1',
      reason: 'The contact point should belong to the existing person.',
    });

    expect(store.setResolverContactPointPersons).toHaveBeenCalledWith(expect.objectContaining({
      contactPointId: 'contact-point-1',
      personIds: ['person-existing'],
      primaryPersonId: 'person-existing',
      resolutionType: 'reassign_contact_point',
    }));
    expect(rebindSpy).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      provisionalPersonId: 'person-provisional',
      canonicalPersonId: 'person-existing',
      performedByUserId: 'resolver-1',
    });
    expect(result).toMatchObject({
      action: 'reassign_contact_point',
      reviewStatus: 'resolved_reassigned',
      resolutionType: 'reassign_contact_point',
      mergeApplied: false,
      rebindTriggered: true,
    });
  });

  it('applies dismiss_no_action without mutating identity truth', async () => {
    const currentReview = buildDecisionReview();
    const updatedReview = buildResolvedReviewForAction('dismiss_no_action', {
      reviewStatus: 'dismissed',
      resolutionType: 'dismiss_no_action',
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      updateResolverReview: jest.fn(async () => updatedReview),
      setResolverContactPointPersons: jest.fn(),
      mergePerson: jest.fn(),
    });
    const rebindSpy = jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads')
      .mockResolvedValue(undefined);
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'dismiss_no_action',
      reason: 'No identity change is required.',
    });

    expect(store.setResolverContactPointPersons).not.toHaveBeenCalled();
    expect(store.mergePerson).not.toHaveBeenCalled();
    expect(rebindSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'dismiss_no_action',
      status: 'dismissed',
      reviewStatus: 'dismissed',
      resolutionType: 'dismiss_no_action',
      mergeApplied: false,
      rebindTriggered: false,
    });
  });

  it('replays an identical terminal resolver decision safely without mutating the review again', async () => {
    const terminalReview = buildResolvedReviewForAction('confirm_existing_person', {
      resolutionReason: 'Matched the existing person.',
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => terminalReview),
      updateResolverReview: jest.fn(),
    });
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_existing_person',
      personId: 'person-existing',
      reason: 'Matched the existing person.',
    });

    expect(store.updateResolverReview).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'confirm_existing_person',
      status: 'resolved',
      reviewStatus: 'resolved_confirmed_existing',
      resolutionType: 'confirm_existing_person',
    });
  });

  it('rejects changing a terminal resolver decision to a different action through applyResolverDecision', async () => {
    const terminalReview = buildResolvedReviewForAction('confirm_existing_person');
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => terminalReview),
      updateResolverReview: jest.fn(),
    });
    const service = new AsyncPeopleCoreService(store as any);

    await expect(service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'dismiss_no_action',
      reason: 'Trying to override the existing terminal outcome.',
    })).rejects.toBeInstanceOf(InvalidResolverReviewTransitionError);
    expect(store.updateResolverReview).not.toHaveBeenCalled();
  });

  it('consumes linked ambiguity events when confirm_existing_person resolves a review', async () => {
    const currentReview = buildDecisionReview({
      triggerSourceId: 'identity-match:confirm-existing',
    });
    const updatedReview = buildResolvedReviewForAction('confirm_existing_person', {
      triggerSourceId: 'identity-match:confirm-existing',
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('person-provisional'),
      ]),
      setResolverContactPointPersons: jest.fn(async () => [
        buildContactPointLink('person-existing'),
      ]),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads').mockResolvedValue(undefined);
    const event = await createIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:confirm-existing',
      normalizedContactPoint: '+12605550021',
      candidateNeighborIds: ['neighbor-1'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
    });
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_existing_person',
      personId: 'person-existing',
      reason: 'Matched the existing person.',
    });

    const consumed = await getIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      ambiguityEventId: event.id,
    });

    expect(result.ambiguityEventIds).toEqual([event.id]);
    expect(consumed).toMatchObject({
      id: event.id,
      status: 'resolved',
      resolverReviewId: 'review-1',
      resolverOutcome: expect.objectContaining({
        action: 'confirm_existing_person',
        personId: 'person-existing',
      }),
    });
  });

  it('consumes linked ambiguity events when merge_people resolves a review', async () => {
    const currentReview = buildDecisionReview({
      reviewType: 'merge_review',
      triggerSourceId: 'identity-match:merge-people',
      candidatePersonIds: ['person-canonical'],
    });
    const updatedReview = buildResolvedReviewForAction('merge_people', {
      reviewType: 'merge_review',
      triggerSourceId: 'identity-match:merge-people',
      candidatePersonIds: ['person-canonical'],
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      mergePerson: jest.fn(async () => ({
        mergedProvisionalPersonId: 'person-provisional',
        canonicalPersonId: 'person-canonical',
        autoMergedContactPointLinkIds: [],
        reviewContactPointLinkIds: [],
        resolverReviewId: 'review-1',
        didPersistMerge: true,
      })),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const mergeEventPublisher = {
      publishPersonMerged: jest.fn(async () => undefined),
    };
    jest.spyOn(personRebindServiceAsync, 'rebindPersonThreads').mockResolvedValue(undefined);
    const event = await createIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:merge-people',
      normalizedContactPoint: '+12605550022',
      candidateNeighborIds: ['neighbor-merge'],
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
    });
    const service = new AsyncPeopleCoreService(store as any, mergeEventPublisher as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'merge_people',
      sourcePersonId: 'person-provisional',
      targetPersonId: 'person-canonical',
      reason: 'Merge the duplicate people.',
    });

    const consumed = await getIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      ambiguityEventId: event.id,
    });

    expect(result.ambiguityEventIds).toEqual([event.id]);
    expect(consumed).toMatchObject({
      id: event.id,
      status: 'resolved',
      resolverReviewId: 'review-1',
      resolverOutcome: expect.objectContaining({
        action: 'merge_people',
        sourcePersonId: 'person-provisional',
        targetPersonId: 'person-canonical',
      }),
    });
  });

  it('dismisses linked ambiguity events when dismiss_no_action resolves a review', async () => {
    const currentReview = buildDecisionReview({
      triggerSourceId: 'identity-match:dismiss-no-action',
    });
    const updatedReview = buildResolvedReviewForAction('dismiss_no_action', {
      triggerSourceId: 'identity-match:dismiss-no-action',
      reviewStatus: 'dismissed',
      resolutionType: 'dismiss_no_action',
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => currentReview),
      updateResolverReview: jest.fn(async () => updatedReview),
    });
    const event = await createIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:dismiss-no-action',
      normalizedContactPoint: '+12605550023',
      candidateNeighborIds: ['neighbor-dismiss'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
    });
    const service = new AsyncPeopleCoreService(store as any);

    const result = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'dismiss_no_action',
      reason: 'No identity change is required.',
    });

    const consumed = await getIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      ambiguityEventId: event.id,
    });

    expect(result.ambiguityEventIds).toEqual([event.id]);
    expect(consumed).toMatchObject({
      id: event.id,
      status: 'dismissed',
      resolverReviewId: 'review-1',
      resolverOutcome: expect.objectContaining({
        action: 'dismiss_no_action',
        reviewStatus: 'dismissed',
      }),
    });
  });

  it('uses safe terminal replay to complete ambiguity-event consumption without conflicting state changes', async () => {
    const terminalReview = buildResolvedReviewForAction('confirm_existing_person', {
      triggerSourceId: 'identity-match:terminal-replay',
      resolutionReason: 'Matched the existing person.',
    });
    const store = createApplyResolverDecisionStore({
      getResolverReview: jest.fn(async () => terminalReview),
      updateResolverReview: jest.fn(),
    });
    const event = await createIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      orgUnitId: 'org-1',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:terminal-replay',
      normalizedContactPoint: '+12605550024',
      candidateNeighborIds: ['neighbor-replay'],
      ambiguityReasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
    });
    const service = new AsyncPeopleCoreService(store as any);

    const first = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_existing_person',
      personId: 'person-existing',
      reason: 'Matched the existing person.',
    });
    const second = await service.applyResolverDecision({
      tenantId: 'tenant-1',
      reviewId: 'review-1',
      actorUserId: 'resolver-1',
      action: 'confirm_existing_person',
      personId: 'person-existing',
      reason: 'Matched the existing person.',
    });

    const consumed = await getIdentityAmbiguityEvent({
      tenantId: 'tenant-1',
      ambiguityEventId: event.id,
    });

    expect(first.ambiguityEventIds).toEqual([event.id]);
    expect(second.ambiguityEventIds).toEqual([event.id]);
    expect(store.updateResolverReview).not.toHaveBeenCalled();
    expect(consumed).toMatchObject({
      id: event.id,
      status: 'resolved',
      resolverReviewId: 'review-1',
      resolverConsumedAtUtc: '2026-03-21T12:12:00.000Z',
    });
  });
});
