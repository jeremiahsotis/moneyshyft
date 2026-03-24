import { RESOLVER_ACTION_TYPES } from '@shyft/contracts';
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

describe('AsyncPeopleCoreService', () => {
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
});
