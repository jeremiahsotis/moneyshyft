import {
  AsyncPeopleCoreService,
  ContactPointLifecycleComputationError,
  PeopleCorePersistenceUnavailableError,
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
});
