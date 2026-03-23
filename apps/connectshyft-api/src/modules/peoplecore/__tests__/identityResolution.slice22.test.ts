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
  PeopleCorePersistenceUnavailableError: class PeopleCorePersistenceUnavailableError extends Error {
    readonly code = 'PEOPLECORE_PERSISTENCE_UNAVAILABLE';

    constructor(cause?: unknown) {
      super('PeopleCore persistence is unavailable.');
      this.name = 'PeopleCorePersistenceUnavailableError';
      if (cause !== undefined) {
        (this as Error & { cause?: unknown }).cause = cause;
      }
    }
  },
}));

import type {
  ContactPoint,
  ContactPointLink,
  HouseholdMembership,
  Person,
} from '@shyft/contracts';
import { assignConfidenceBand } from '../confidenceBand';
import {
  resolveInboundContactPointIdentityAsync,
} from '../contactPointIdentityResolution';
import {
  scoreIdentityCandidates,
  type CandidateSubject,
  type ScoreContext,
} from '../identityScoring';
import { PeopleCorePersistenceUnavailableError } from '../service';

const BASE_INPUT = {
  tenantId: 'tenant-1',
  orgUnitId: 'org-1',
  normalizedContactPointValue: '+12605551212',
  rawContactPointValue: '(260) 555-1212',
  contactPointType: 'phone' as const,
  eventSource: 'connectshyft',
  relatedObjectType: 'connectshyft_webhook_receipt',
  relatedObjectId: 'receipt-slice22',
  requestedByUserId: 'user-1',
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
  relatedObjectId: 'receipt-slice22',
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

const buildScoreContext = (overrides: Partial<ScoreContext> = {}): ScoreContext => ({
  contactPoint: {
    status: 'stale',
    confirmedShared: false,
    reassignmentSuspected: false,
  },
  contactPointStatus: 'stale',
  currentLinkCount: 1,
  currentLinks: [],
  historicalLinks: [],
  householdMemberships: [] as HouseholdMembership[],
  recentActivity: [],
  recentConfirmation: [],
  asOfUtc: '2026-03-23T12:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  Object.values(mockPeopleCoreService).forEach((mockFn) => mockFn.mockReset());
  mockPeopleCoreService.listContactPointsByNormalizedValue.mockResolvedValue([CONTACT_POINT]);
  mockPeopleCoreService.listContactPointEvents.mockResolvedValue([]);
  mockPeopleCoreService.appendContactPointEvent.mockResolvedValue(CONTACT_POINT_EVENT);
  mockPeopleCoreService.listContactPointLinks.mockImplementation(async ({ isCurrent }: { isCurrent?: boolean }) =>
    isCurrent ? [] : []);
  mockPeopleCoreService.listHouseholdMemberships.mockResolvedValue([]);
  mockPeopleCoreService.listResolverReviews.mockResolvedValue([]);
  mockPeopleCoreService.getPerson.mockResolvedValue(null);
  mockPeopleCoreService.getHousehold.mockResolvedValue(null);
});

describe('scoreIdentityCandidates', () => {
  it('orders candidates by deterministic score and surfaces reasons and risk flags', () => {
    const currentPerson: CandidateSubject = {
      subjectType: 'person',
      subjectId: 'person-a',
      generationReason: 'current_person_link',
      directness: 'direct',
      recencyHint: 'current',
      supportingLinkIds: ['current-link-a'],
    };
    const historicalPerson: CandidateSubject = {
      subjectType: 'person',
      subjectId: 'person-b',
      generationReason: 'historical_person_link',
      directness: 'direct',
      recencyHint: 'historical',
      supportingLinkIds: ['historical-link-b'],
    };
    const currentLink = buildLink({
      id: 'current-link-a',
      subjectId: currentPerson.subjectId,
      manuallyConfirmed: true,
      confirmationSource: 'resolver',
      lastUsedAt: '2026-03-20T12:00:00.000Z',
      lastConfirmedAt: '2026-03-19T12:00:00.000Z',
    });
    const historicalLink = buildLink({
      id: 'historical-link-b',
      subjectId: historicalPerson.subjectId,
      isCurrent: false,
      isPrimary: false,
      manuallyConfirmed: false,
      confirmationSource: undefined,
      lastUsedAt: '2024-01-01T12:00:00.000Z',
      lastConfirmedAt: undefined,
      linkType: 'historical',
    });

    const scored = scoreIdentityCandidates(
      [currentPerson, historicalPerson],
      buildScoreContext({
        currentLinks: [currentLink],
        historicalLinks: [historicalLink],
      }),
    );

    expect(scored.map((candidate) => candidate.subjectId)).toEqual(['person-a', 'person-b']);
    expect(scored[0]).toMatchObject({
      subjectId: 'person-a',
      score: 185,
      riskFlags: ['stale_contact'],
    });
    expect(scored[0]?.confidenceReasons).toEqual(expect.arrayContaining([
      'exact current person link (+60)',
      'current primary link (+15)',
      'manual confirmation on current link (+40)',
      'resolver verified current link (+60)',
      'recent activity in last 0-30 days (+20)',
      'recent confirmation in last 0-180 days (+15)',
      'ContactPoint status stale (-25)',
    ]));
    expect(scored[1]).toMatchObject({
      subjectId: 'person-b',
      score: -80,
      riskFlags: ['stale_contact', 'archived_prior_owner'],
    });
  });
});

describe('assignConfidenceBand', () => {
  it('maps score thresholds and applies locked caps', () => {
    expect(assignConfidenceBand(-5, 'active_personal', false)).toBe('very_low');
    expect(assignConfidenceBand(20, 'active_personal', false)).toBe('low');
    expect(assignConfidenceBand(60, 'active_personal', false)).toBe('medium');
    expect(assignConfidenceBand(100, 'active_personal', false)).toBe('high');
    expect(assignConfidenceBand(140, 'active_personal', false)).toBe('very_high');
    expect(assignConfidenceBand(120, 'reassignment_suspected', false)).toBe('medium');
    expect(assignConfidenceBand(120, 'active_shared_confirmed', false)).toBe('high');
    expect(assignConfidenceBand(120, 'active_personal', true)).toBe('high');
  });
});

describe('resolveInboundContactPointIdentityAsync slice 22', () => {
  it('reuses an existing pending resolver review for the same trigger instead of creating duplicates', async () => {
    const personA = buildPerson({ id: 'person-a' });
    const personB = buildPerson({ id: 'person-b' });
    const provisionalPerson = buildPerson({
      id: 'person-provisional',
      status: 'active_provisional',
      firstName: 'Unknown',
      lastName: 'Contact',
    });
    const existingReview = {
      id: 'review-existing',
      tenantId: BASE_INPUT.tenantId,
      orgUnitId: BASE_INPUT.orgUnitId,
      reviewType: 'identity_conflict' as const,
      reviewStatus: 'pending' as const,
      priority: 'normal' as const,
      triggerSourceType: 'contact_point_resolution',
      triggerSourceId: BASE_INPUT.relatedObjectId,
      provisionalPersonId: provisionalPerson.id,
      candidatePersonIds: [personA.id, personB.id],
      contactPointId: CONTACT_POINT.id,
      confidenceBand: 'medium' as const,
      confidenceReasons: ['Resolver review required because inbound identity is not decisive.'],
      riskFlags: ['shared_contact_possible'] as const,
      requestedByUserId: BASE_INPUT.requestedByUserId!,
      requestedAt: '2026-03-23T12:05:00.000Z',
    };

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
    mockPeopleCoreService.getPerson.mockImplementation(async ({ personId }: { personId: string }) => {
      return [personA, personB, provisionalPerson].find((person) => person.id === personId) || null;
    });
    mockPeopleCoreService.createPerson.mockResolvedValue(provisionalPerson);
    mockPeopleCoreService.createContactPointLink.mockResolvedValue(
      buildLink({
        id: 'link-provisional',
        subjectId: provisionalPerson.id,
      }),
    );
    mockPeopleCoreService.createResolverReview.mockResolvedValue(existingReview);
    mockPeopleCoreService.listResolverReviews
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([existingReview]);

    const first = await resolveInboundContactPointIdentityAsync(BASE_INPUT);
    const second = await resolveInboundContactPointIdentityAsync(BASE_INPUT);

    expect(first).toMatchObject({
      outcome: 'resolver_needed',
      personId: provisionalPerson.id,
      provisionalPersonId: provisionalPerson.id,
      resolverReviewId: existingReview.id,
    });
    expect(second).toMatchObject({
      outcome: 'resolver_needed',
      personId: provisionalPerson.id,
      provisionalPersonId: provisionalPerson.id,
      resolverReviewId: existingReview.id,
    });
    expect(mockPeopleCoreService.createPerson).toHaveBeenCalledTimes(1);
    expect(mockPeopleCoreService.createResolverReview).toHaveBeenCalledTimes(1);
  });

  it('throws PeopleCorePersistenceUnavailableError and does not create a resolver review when persistence is unavailable', async () => {
    mockPeopleCoreService.listContactPointsByNormalizedValue.mockRejectedValue(
      new PeopleCorePersistenceUnavailableError({ code: '42P01' }),
    );

    await expect(resolveInboundContactPointIdentityAsync(BASE_INPUT))
      .rejects.toBeInstanceOf(PeopleCorePersistenceUnavailableError);
    expect(mockPeopleCoreService.createResolverReview).not.toHaveBeenCalled();
  });
});
