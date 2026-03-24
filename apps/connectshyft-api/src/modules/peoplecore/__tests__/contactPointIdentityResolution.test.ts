const mockPeopleCoreService = {
  appendContactPointEvent: jest.fn(),
  createContactPoint: jest.fn(),
  createContactPointLink: jest.fn(),
  createPerson: jest.fn(),
  createResolverReview: jest.fn(),
  getHousehold: jest.fn(),
  getPerson: jest.fn(),
  listContactPointEvents: jest.fn(),
  listContactPointLinks: jest.fn(),
  listContactPointsByNormalizedValue: jest.fn(),
  listHouseholdMemberships: jest.fn(),
  listResolverReviews: jest.fn(),
};

jest.mock('../service', () => ({
  peopleCoreServiceAsync: mockPeopleCoreService,
  AsyncPeopleCoreService: class AsyncPeopleCoreService {},
}));

import type {
  ContactPoint,
  ContactPointLink,
  Household,
  HouseholdMembership,
  Person,
} from '@shyft/contracts';
import {
  generatePeopleCoreIdentityCandidates,
  resolveInboundContactPointIdentityAsync,
} from '../contactPointIdentityResolution';

const BASE_INPUT = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  normalizedContactPointValue: '+12605551212',
  rawContactPointValue: '(260) 555-1212',
  contactPointType: 'phone' as const,
  eventSource: 'connectshyft',
  relatedObjectType: 'connectshyft_webhook_receipt',
  relatedObjectId: 'receipt-1',
  requestedByUserId: null,
};

const CONTACT_POINT: ContactPoint = {
  id: 'contact-point-1',
  tenantId: 'tenant-1',
  type: 'phone',
  normalizedValue: '+12605551212',
  rawValue: '(260) 555-1212',
  status: 'active_personal',
  firstSeenAt: '2026-03-23T12:00:00.000Z',
  lastSeenAt: '2026-03-23T12:00:00.000Z',
  lastInboundAt: '2026-03-23T12:00:00.000Z',
  suspectedShared: false,
  confirmedShared: false,
  reassignmentSuspected: false,
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
};

const CONTACT_POINT_EVENT = {
  id: 'event-1',
  tenantId: 'tenant-1',
  contactPointId: CONTACT_POINT.id,
  eventType: 'inbound_seen' as const,
  eventSource: 'connectshyft',
  relatedObjectType: 'connectshyft_webhook_receipt',
  relatedObjectId: 'receipt-1',
  createdAt: '2026-03-23T12:01:00.000Z',
};

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1',
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'active_confirmed',
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

const buildHousehold = (overrides: Partial<Household> = {}): Household => ({
  id: 'household-1',
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  name: 'Lovelace Home',
  status: 'active',
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

const buildMembership = (overrides: Partial<HouseholdMembership> = {}): HouseholdMembership => ({
  id: 'membership-1',
  householdId: 'household-1',
  personId: 'person-3',
  role: 'member',
  isCurrent: true,
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

const buildLink = (overrides: Partial<ContactPointLink> = {}): ContactPointLink => ({
  id: 'link-1',
  contactPointId: CONTACT_POINT.id,
  subjectType: 'person',
  subjectId: 'person-1',
  linkType: 'primary',
  confidenceBand: 'high',
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: '2026-03-23T12:00:00.000Z',
  lastConfirmedAt: '2026-03-23T12:00:00.000Z',
  lastUsedAt: '2026-03-23T12:00:00.000Z',
  linkedBy: 'system',
  createdAt: '2026-03-23T12:00:00.000Z',
  updatedAt: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

const defaultPersonLookup = (persons: Person[]) => {
  const personById = new Map(persons.map((person) => [person.id, person]));
  mockPeopleCoreService.getPerson.mockImplementation(async ({ personId }: { personId: string }) =>
    personById.get(personId) || null);
};

const defaultHouseholdLookup = (households: Household[]) => {
  const householdById = new Map(households.map((household) => [household.id, household]));
  mockPeopleCoreService.getHousehold.mockImplementation(
    async ({ householdId }: { householdId: string }) => householdById.get(householdId) || null,
  );
};

beforeEach(() => {
  Object.values(mockPeopleCoreService).forEach((mockFn) => mockFn.mockReset());
  mockPeopleCoreService.listContactPointsByNormalizedValue.mockResolvedValue([CONTACT_POINT]);
  mockPeopleCoreService.listContactPointEvents.mockResolvedValue([]);
  mockPeopleCoreService.appendContactPointEvent.mockResolvedValue(CONTACT_POINT_EVENT);
  mockPeopleCoreService.listContactPointLinks.mockImplementation(async ({ isCurrent }: { isCurrent?: boolean }) =>
    isCurrent ? [] : []);
  mockPeopleCoreService.listHouseholdMemberships.mockResolvedValue([]);
  mockPeopleCoreService.listResolverReviews.mockResolvedValue([]);
  defaultPersonLookup([]);
  defaultHouseholdLookup([]);
});

describe('generatePeopleCoreIdentityCandidates', () => {
  it('uses the locked generation order and suppresses historical fallbacks when current links exist', () => {
    const generated = generatePeopleCoreIdentityCandidates({
      contactPoint: CONTACT_POINT,
      currentLinks: [
        buildLink({
          id: 'current-person-link',
          subjectType: 'person',
          subjectId: 'person-1',
        }),
        buildLink({
          id: 'current-household-link',
          subjectType: 'household',
          subjectId: 'household-1',
        }),
      ],
      historicalLinks: [
        buildLink({
          id: 'historical-person-link',
          subjectType: 'person',
          subjectId: 'person-2',
          isCurrent: false,
          isPrimary: false,
        }),
        buildLink({
          id: 'historical-household-link',
          subjectType: 'household',
          subjectId: 'household-2',
          isCurrent: false,
          isPrimary: false,
        }),
      ],
      householdMemberships: [
        buildMembership({
          id: 'membership-current-household-member',
          householdId: 'household-1',
          personId: 'person-3',
        }),
      ],
      persons: [
        buildPerson({ id: 'person-1' }),
        buildPerson({ id: 'person-2' }),
        buildPerson({ id: 'person-3' }),
      ],
      households: [
        buildHousehold({ id: 'household-1' }),
        buildHousehold({ id: 'household-2' }),
      ],
    });

    expect(generated).toEqual([
      expect.objectContaining({
        subjectType: 'person',
        subjectId: 'person-1',
        generationReason: 'current_person_link',
      }),
      expect.objectContaining({
        subjectType: 'household',
        subjectId: 'household-1',
        generationReason: 'current_household_link',
      }),
      expect.objectContaining({
        subjectType: 'person',
        subjectId: 'person-3',
        generationReason: 'current_household_member',
      }),
    ]);
  });
});

describe('resolveInboundContactPointIdentityAsync', () => {
  it('returns a canonical attach for a decisive current person link and records inbound_seen', async () => {
    const canonicalPerson = buildPerson({ id: 'person-canonical' });

    mockPeopleCoreService.listContactPointLinks.mockImplementation(async ({ isCurrent }: { isCurrent?: boolean }) =>
      isCurrent
        ? [
          buildLink({
            id: 'current-person-link',
            subjectId: canonicalPerson.id,
            manuallyConfirmed: false,
            confirmationSource: undefined,
            lastUsedAt: '2026-03-23T11:50:00.000Z',
            lastConfirmedAt: '2026-03-23T11:45:00.000Z',
          }),
        ]
        : []);
    defaultPersonLookup([canonicalPerson]);

    const result = await resolveInboundContactPointIdentityAsync(BASE_INPUT);

    expect(result).toMatchObject({
      outcome: 'canonical',
      confidenceBand: 'high',
      contactPointStatus: 'active_personal',
      personId: canonicalPerson.id,
      contactPointId: CONTACT_POINT.id,
      contactPointEventId: CONTACT_POINT_EVENT.id,
      provisionalPersonId: null,
      resolverReviewId: null,
      selectedCandidatePersonId: canonicalPerson.id,
    });
    expect(result.candidates[0]).toMatchObject({
      subjectId: canonicalPerson.id,
      contactPointStatus: 'active_personal',
    });
    expect(mockPeopleCoreService.appendContactPointEvent).toHaveBeenCalledWith({
      tenantId: BASE_INPUT.tenantId,
      contactPointId: CONTACT_POINT.id,
      eventType: 'inbound_seen',
      eventSource: BASE_INPUT.eventSource,
      relatedObjectType: BASE_INPUT.relatedObjectType,
      relatedObjectId: BASE_INPUT.relatedObjectId,
    });
  });

  it('creates a provisional person, contact point, and current link when no candidates exist', async () => {
    const provisionalPerson = buildPerson({
      id: 'person-provisional',
      status: 'active_provisional',
      firstName: 'Unknown',
      lastName: 'Contact',
    });
    const createdContactPoint = {
      ...CONTACT_POINT,
      id: 'contact-point-created',
    };

    mockPeopleCoreService.listContactPointsByNormalizedValue.mockResolvedValue([]);
    mockPeopleCoreService.createContactPoint.mockResolvedValue(createdContactPoint);
    mockPeopleCoreService.appendContactPointEvent.mockResolvedValue({
      ...CONTACT_POINT_EVENT,
      contactPointId: createdContactPoint.id,
    });
    mockPeopleCoreService.createPerson.mockResolvedValue(provisionalPerson);
    mockPeopleCoreService.createContactPointLink.mockResolvedValue(
      buildLink({
        id: 'link-provisional',
        subjectId: provisionalPerson.id,
      }),
    );

    const result = await resolveInboundContactPointIdentityAsync({
      ...BASE_INPUT,
      relatedObjectId: 'receipt-2',
    });

    expect(result).toMatchObject({
      outcome: 'provisional',
      confidenceBand: 'very_low',
      contactPointStatus: 'active_personal',
      personId: provisionalPerson.id,
      contactPointId: createdContactPoint.id,
      provisionalPersonId: provisionalPerson.id,
      resolverReviewId: null,
      selectedCandidatePersonId: null,
    });
    expect(mockPeopleCoreService.createPerson).toHaveBeenCalledWith({
      tenantId: BASE_INPUT.tenantId,
      orgUnitId: BASE_INPUT.orgUnitId,
      firstName: 'Unknown',
      lastName: 'Contact',
      status: 'active_provisional',
    });
    expect(mockPeopleCoreService.createContactPointLink).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: BASE_INPUT.tenantId,
        contactPointId: createdContactPoint.id,
        subjectType: 'person',
        subjectId: provisionalPerson.id,
      }),
    );
  });

  it('forces resolver_required when the top candidate lead is under 20 points', async () => {
    const personA = buildPerson({ id: 'person-a' });
    const personB = buildPerson({ id: 'person-b' });
    const provisionalPerson = buildPerson({
      id: 'person-provisional-tie',
      status: 'active_provisional',
      firstName: 'Unknown',
      lastName: 'Contact',
    });

    mockPeopleCoreService.listContactPointLinks.mockImplementation(async ({ isCurrent }: { isCurrent?: boolean }) =>
      isCurrent
        ? [
          buildLink({
            id: 'current-person-link-a',
            subjectId: personA.id,
            isPrimary: false,
            lastUsedAt: '2026-03-18T12:00:00.000Z',
            lastConfirmedAt: undefined,
          }),
          buildLink({
            id: 'current-person-link-b',
            subjectId: personB.id,
            isPrimary: false,
            lastUsedAt: '2026-02-20T12:00:00.000Z',
            lastConfirmedAt: undefined,
          }),
        ]
        : []);
    defaultPersonLookup([personA, personB]);
    mockPeopleCoreService.createPerson.mockResolvedValue(provisionalPerson);
    mockPeopleCoreService.createContactPointLink.mockResolvedValue(
      buildLink({
        id: 'link-provisional-tie',
        subjectId: provisionalPerson.id,
      }),
    );
    mockPeopleCoreService.createResolverReview.mockResolvedValue({
      id: 'review-tie',
      tenantId: BASE_INPUT.tenantId,
      orgUnitId: BASE_INPUT.orgUnitId,
      reviewType: 'identity_conflict',
      reviewStatus: 'pending',
      priority: 'normal',
      triggerSourceType: 'contact_point_resolution',
      triggerSourceId: 'receipt-3',
      provisionalPersonId: provisionalPerson.id,
      candidatePersonIds: [personA.id, personB.id],
      contactPointId: CONTACT_POINT.id,
      confidenceBand: 'medium',
      confidenceReasons: [
        'exact current person link (+60)',
        'recent activity in last 0-30 days (+20)',
        'multiple current person links on same ContactPoint (-35)',
        'Resolver review required because inbound identity is not decisive.',
      ],
      riskFlags: ['shared_contact_possible'],
      requestedByUserId: 'system-connectshyft-identity-seam',
      requestedAt: '2026-03-23T12:05:00.000Z',
    });

    const result = await resolveInboundContactPointIdentityAsync({
      ...BASE_INPUT,
      relatedObjectId: 'receipt-3',
    });

    expect(result).toMatchObject({
      outcome: 'resolver_required',
      confidenceBand: 'medium',
      contactPointStatus: 'active_personal',
      personId: provisionalPerson.id,
      provisionalPersonId: provisionalPerson.id,
      resolverReviewId: 'review-tie',
      selectedCandidatePersonId: personA.id,
    });
    expect(result.candidates[0]).toMatchObject({
      subjectId: personA.id,
      contactPointStatus: 'active_personal',
    });
    expect(mockPeopleCoreService.createResolverReview).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: BASE_INPUT.tenantId,
        orgUnitId: BASE_INPUT.orgUnitId,
        reviewType: 'identity_conflict',
        priority: 'normal',
        triggerSourceType: 'contact_point_resolution',
        triggerSourceId: 'receipt-3',
        provisionalPersonId: provisionalPerson.id,
        candidatePersonIds: [personA.id, personB.id],
        confidenceBand: 'medium',
        riskFlags: ['shared_contact_possible'],
      }),
    );
  });

  it('forces resolver_required when the top candidate lands in the very_high band', async () => {
    const person = buildPerson({ id: 'person-very-high' });
    const provisionalPerson = buildPerson({
      id: 'person-provisional-very-high',
      status: 'active_provisional',
      firstName: 'Unknown',
      lastName: 'Contact',
    });

    mockPeopleCoreService.listContactPointLinks.mockImplementation(async ({ isCurrent }: { isCurrent?: boolean }) =>
      isCurrent
        ? [
          buildLink({
            id: 'current-person-link-very-high',
            subjectId: person.id,
            manuallyConfirmed: true,
            confirmationSource: 'resolver',
            lastUsedAt: '2026-03-23T11:50:00.000Z',
            lastConfirmedAt: '2026-03-23T11:45:00.000Z',
          }),
        ]
        : []);
    defaultPersonLookup([person]);
    mockPeopleCoreService.createPerson.mockResolvedValue(provisionalPerson);
    mockPeopleCoreService.createContactPointLink.mockResolvedValue(
      buildLink({
        id: 'link-provisional-very-high',
        subjectId: provisionalPerson.id,
      }),
    );
    mockPeopleCoreService.createResolverReview.mockResolvedValue({
      id: 'review-very-high',
      tenantId: BASE_INPUT.tenantId,
      orgUnitId: BASE_INPUT.orgUnitId,
      reviewType: 'identity_conflict',
      reviewStatus: 'pending',
      priority: 'normal',
      triggerSourceType: 'contact_point_resolution',
      triggerSourceId: 'receipt-4',
      provisionalPersonId: provisionalPerson.id,
      candidatePersonIds: [person.id],
      contactPointId: CONTACT_POINT.id,
      confidenceBand: 'very_high',
      confidenceReasons: [
        'exact current person link (+60)',
        'current primary link (+15)',
        'manual confirmation on current link (+40)',
        'resolver verified current link (+60)',
        'recent activity in last 0-30 days (+20)',
        'recent confirmation in last 0-180 days (+15)',
        'Resolver review required because inbound identity is not decisive.',
      ],
      riskFlags: ['high_confidence_override_attempt'],
      requestedByUserId: 'system-connectshyft-identity-seam',
      requestedAt: '2026-03-23T12:06:00.000Z',
    });

    const result = await resolveInboundContactPointIdentityAsync({
      ...BASE_INPUT,
      relatedObjectId: 'receipt-4',
    });

    expect(result).toMatchObject({
      outcome: 'resolver_required',
      confidenceBand: 'very_high',
      contactPointStatus: 'active_personal',
      personId: provisionalPerson.id,
      provisionalPersonId: provisionalPerson.id,
      resolverReviewId: 'review-very-high',
      selectedCandidatePersonId: person.id,
    });
    expect(result.candidates[0]).toMatchObject({
      subjectId: person.id,
      contactPointStatus: 'active_personal',
    });
    expect(mockPeopleCoreService.createResolverReview).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: BASE_INPUT.tenantId,
        orgUnitId: BASE_INPUT.orgUnitId,
        triggerSourceId: 'receipt-4',
        provisionalPersonId: provisionalPerson.id,
        candidatePersonIds: [person.id],
        confidenceBand: 'very_high',
        riskFlags: expect.arrayContaining(['high_confidence_override_attempt']),
      }),
    );
  });
});
