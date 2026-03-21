import { PeopleCorePersistenceUnavailableError } from '../../peoplecore/service';
import { AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter } from '../peoplecoreIdentityAdapter';
import type { ConnectShyftIdentityBoundaryNeighbor } from '../identityBoundary';

jest.mock('../ambiguityEvents', () => ({
  createIdentityAmbiguityEvent: jest.fn(),
}), { virtual: true });

const ambiguityEventsModule = jest.requireMock('../ambiguityEvents') as {
  createIdentityAmbiguityEvent: jest.Mock;
};

const TIMESTAMP = '2026-03-21T12:00:00.000Z';

const buildNeighbor = (
  neighborId: string,
  value: string,
  overrides: Partial<ConnectShyftIdentityBoundaryNeighbor['phones'][number]> = {},
): ConnectShyftIdentityBoundaryNeighbor => ({
  neighborId,
  phones: [
    {
      phoneId: `${neighborId}-phone-1`,
      value,
      isShared: false,
      verificationStatus: 'verified',
      ...overrides,
    },
  ],
});

const buildContactPoint = (contactPointId: string, normalizedValue: string) => ({
  id: contactPointId,
  tenantId: 'tenant-a',
  type: 'phone' as const,
  normalizedValue,
  status: 'active_personal' as const,
  firstSeenAt: TIMESTAMP,
  lastSeenAt: TIMESTAMP,
  suspectedShared: false,
  confirmedShared: false,
  reassignmentSuspected: false,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
});

const buildContactPointLink = (contactPointId: string, subjectId: string) => ({
  id: `${contactPointId}-link-1`,
  contactPointId,
  subjectType: 'person' as const,
  subjectId,
  linkType: 'primary' as const,
  confidenceBand: 'high' as const,
  isCurrent: true,
  isPrimary: true,
  manuallyConfirmed: false,
  firstLinkedAt: TIMESTAMP,
  linkedBy: 'system' as const,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
});

describe('connectshyft peoplecore identity adapter', () => {
  beforeEach(() => {
    ambiguityEventsModule.createIdentityAmbiguityEvent.mockReset();
  });

  it('creates provisional PeopleCore foundation on no-match without changing the ConnectShyft result', async () => {
    const peopleCoreService = {
      listContactPointsByNormalizedValue: jest.fn(async () => []),
      listCurrentContactPointLinks: jest.fn(async () => []),
      createContactPoint: jest.fn(async () => buildContactPoint('contact-point-3', '+12605551220')),
      createPerson: jest.fn(async () => ({
        id: 'person-3',
        tenantId: 'tenant-a',
        orgUnitId: 'org-a',
        firstName: 'Unknown',
        lastName: 'Contact',
        status: 'active_provisional',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      })),
      createContactPointLink: jest.fn(async () => ({
        id: 'link-3',
        contactPointId: 'contact-point-3',
        subjectType: 'person',
        subjectId: 'person-3',
        linkType: 'unknown',
        confidenceBand: 'low',
        isCurrent: true,
        isPrimary: true,
        manuallyConfirmed: false,
        firstLinkedAt: TIMESTAMP,
        linkedBy: 'system',
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      })),
      listResolverReviews: jest.fn(async () => []),
      createResolverReview: jest.fn(),
    };
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [],
      async () => [],
      peopleCoreService as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: {
        label: 'mobile',
        value: '2605551220',
        verificationStatus: 'verified',
      },
      hookContext: {
        createProvisionalOnNoMatch: true,
        triggerSourceType: 'connectshyft_inbound_subject_resolution',
      },
    })).resolves.toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH',
      data: {
        identityMatch: {
          matchedNeighborId: null,
          contactPoint: {
            value: '+12605551220',
          },
        },
      },
    });

    expect(peopleCoreService.createPerson).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      status: 'active_provisional',
    }));
    expect(peopleCoreService.createContactPointLink).toHaveBeenCalled();
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).not.toHaveBeenCalled();
  });

  it('evaluates normalized contact-point candidates through the PeopleCore lookup path before preserving current ConnectShyft candidates', async () => {
    const peopleCoreService = {
      listContactPointsByNormalizedValue: jest.fn(async () => [
        buildContactPoint('contact-point-1', '+12605551212'),
      ]),
      listCurrentContactPointLinks: jest.fn(async () => [
        buildContactPointLink('contact-point-1', 'person-1'),
      ]),
    };
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-1', '+12605551212')],
      async () => [buildNeighbor('neighbor-1', '+12605551212')],
      peopleCoreService as any,
    );

    const lookup = await adapter.evaluateIdentityCandidatesForContactPoint({
      tenantId: 'tenant-a',
      contactPointValue: '(260) 555-1212',
    });

    expect(peopleCoreService.listContactPointsByNormalizedValue).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      type: 'phone',
      normalizedValue: '+12605551212',
    });
    expect(peopleCoreService.listCurrentContactPointLinks).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      contactPointId: 'contact-point-1',
    });
    expect(lookup).toMatchObject({
      normalizedContactPointValue: '+12605551212',
      peopleCoreAvailable: true,
      peopleCoreContactPoints: [
        {
          id: 'contact-point-1',
        },
      ],
      peopleCoreCurrentLinks: [
        {
          id: 'contact-point-1-link-1',
          subjectId: 'person-1',
        },
      ],
      candidateNeighbors: [
        {
          neighborId: 'neighbor-1',
        },
      ],
    });
  });

  it('preserves current auto-merge behavior while consulting the PeopleCore seam', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-1', '+12605551212')],
      async () => [buildNeighbor('neighbor-1', '+12605551212')],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-1', '+12605551212'),
        ],
        listCurrentContactPointLinks: async () => [
          buildContactPointLink('contact-point-1', 'person-1'),
        ],
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      idempotencyKey: 'identity-match:auto-merge-allowed',
      contactPoint: {
        label: 'mobile',
        value: '260-555-1212',
        verificationStatus: 'verified',
      },
    })).resolves.toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-1',
          contactPoint: {
            value: '+12605551212',
          },
        },
      },
    });
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).not.toHaveBeenCalled();
  });

  it('preserves current ambiguous/manual-resolution behavior when fallback candidates remain ambiguous', async () => {
    const createResolverReview = jest.fn(async () => ({
      id: 'resolver-review-ambiguous',
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      reviewType: 'shared_contact_ambiguity',
      reviewStatus: 'pending',
      priority: 'high',
      triggerSourceType: 'connectshyft_identity_match',
      triggerSourceId: 'identity-match:ambiguous',
      candidatePersonIds: ['person-1', 'person-2'],
      contactPointId: 'contact-point-2',
      confidenceBand: 'high',
      confidenceReasons: ['Multiple exact contact-point matches require resolver review.'],
      riskFlags: ['shared_contact_possible'],
      requestedByUserId: 'user-1',
      requestedAt: TIMESTAMP,
    }));
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [
        buildNeighbor('neighbor-1', '+12605551213'),
        buildNeighbor('neighbor-2', '+12605551213'),
      ],
      async () => [
        buildNeighbor('neighbor-1', '+12605551213'),
        buildNeighbor('neighbor-2', '+12605551213'),
      ],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-2', '+12605551213'),
        ],
        listCurrentContactPointLinks: async () => [
          buildContactPointLink('contact-point-2', 'person-1'),
          buildContactPointLink('contact-point-2', 'person-2'),
        ],
        listResolverReviews: async () => [],
        createResolverReview,
        createContactPoint: jest.fn(),
        createPerson: jest.fn(),
        createContactPointLink: jest.fn(),
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: {
        label: 'mobile',
        value: '+1 (260) 555-1213',
        verificationStatus: 'verified',
      },
      hookContext: {
        createResolverReviewOnAmbiguous: true,
        triggerSourceType: 'connectshyft_identity_match',
        triggerSourceId: 'identity-match:ambiguous',
        requestedByUserId: 'user-1',
      },
    })).resolves.toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          candidateNeighborIds: ['neighbor-1', 'neighbor-2'],
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
        },
      },
    });

    expect(createResolverReview).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      triggerSourceType: 'connectshyft_identity_match',
      triggerSourceId: 'identity-match:ambiguous',
      requestedByUserId: 'user-1',
    }));
  });

  it('characterizes a PeopleCore single-current-link disagreement with a different legacy neighbor as ambiguous', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-a', '+12605551218')],
      async () => [buildNeighbor('neighbor-legacy-b', '+12605551218')],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-18', '+12605551218'),
        ],
        listCurrentContactPointLinks: async () => [
          buildContactPointLink('contact-point-18', 'person-18'),
        ],
        listResolverReviews: async () => [],
        createResolverReview: jest.fn(),
        createContactPoint: jest.fn(),
        createPerson: jest.fn(),
        createContactPointLink: jest.fn(),
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      idempotencyKey: 'identity-match:peoplecore-disagreement',
      contactPoint: {
        label: 'mobile',
        value: '(260) 555-1218',
        verificationStatus: 'verified',
      },
      hookContext: {
        createResolverReviewOnAmbiguous: true,
        triggerSourceType: 'connectshyft_identity_match',
        triggerSourceId: 'identity-match:peoplecore-disagreement',
        requestedByUserId: 'user-1',
      },
    })).resolves.toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          matchedNeighborId: null,
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
        },
      },
    });
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).toHaveBeenCalledTimes(1);
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:peoplecore-disagreement',
      normalizedContactPoint: '+12605551218',
      contactPointType: 'phone',
      candidateNeighborIds: ['neighbor-legacy-b'],
      candidateCount: 1,
      ambiguityReasonCode: 'PEOPLECORE_LEGACY_DISAGREEMENT',
      requestedByUserId: 'user-1',
      idempotencyKey: 'identity-match:peoplecore-disagreement',
    }));
  });

  it('characterizes multiple PeopleCore current links as ambiguous even when legacy has a single candidate', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-19', '+12605551219')],
      async () => [buildNeighbor('neighbor-legacy-19', '+12605551219')],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-19', '+12605551219'),
        ],
        listCurrentContactPointLinks: async () => [
          buildContactPointLink('contact-point-19', 'person-19-a'),
          buildContactPointLink('contact-point-19', 'person-19-b'),
        ],
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      idempotencyKey: 'identity-match:peoplecore-multi-current-links',
      contactPoint: {
        label: 'mobile',
        value: '2605551219',
        verificationStatus: 'verified',
      },
      hookContext: {
        triggerSourceType: 'connectshyft_identity_match',
        triggerSourceId: 'identity-match:peoplecore-multi-current-links',
        requestedByUserId: 'user-1',
      },
    })).resolves.toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          matchedNeighborId: null,
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
        },
      },
    });
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).toHaveBeenCalledTimes(1);
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      sourceContext: 'connectshyft_identity_match',
      sourceContextId: 'identity-match:peoplecore-multi-current-links',
      normalizedContactPoint: '+12605551219',
      contactPointType: 'phone',
      candidateNeighborIds: ['neighbor-legacy-19'],
      candidateCount: 1,
      ambiguityReasonCode: 'PEOPLECORE_MULTI_CURRENT_LINKS',
      requestedByUserId: 'user-1',
      idempotencyKey: 'identity-match:peoplecore-multi-current-links',
    }));
  });

  it('preserves legacy single-match fallback when PeopleCore has no current person links', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-20', '+12605551220')],
      async () => [buildNeighbor('neighbor-legacy-20', '+12605551220')],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-20', '+12605551220'),
        ],
        listCurrentContactPointLinks: async () => [],
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: {
        label: 'mobile',
        value: '2605551220',
        verificationStatus: 'verified',
      },
    })).resolves.toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-legacy-20',
          contactPoint: {
            value: '+12605551220',
          },
        },
      },
    });
  });

  it('falls back cleanly when PeopleCore persistence is unavailable', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-1', '+12605551214')],
      async () => [buildNeighbor('neighbor-1', '+12605551214')],
      {
        listContactPointsByNormalizedValue: async () => {
          throw new PeopleCorePersistenceUnavailableError(new Error('people schema missing'));
        },
        listCurrentContactPointLinks: jest.fn(),
      } as any,
    );

    await expect(adapter.evaluateIdentityCandidatesForContactPoint({
      tenantId: 'tenant-a',
      contactPointValue: '2605551214',
    })).resolves.toMatchObject({
      normalizedContactPointValue: '+12605551214',
      peopleCoreAvailable: false,
      peopleCoreContactPoints: [],
      peopleCoreCurrentLinks: [],
      candidateNeighbors: [
        {
          neighborId: 'neighbor-1',
        },
      ],
    });
  });

  it('preserves legacy single-match evaluation when PeopleCore persistence is unavailable', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-21', '+12605551221')],
      async () => [buildNeighbor('neighbor-legacy-21', '+12605551221')],
      {
        listContactPointsByNormalizedValue: async () => {
          throw new PeopleCorePersistenceUnavailableError(new Error('people schema missing'));
        },
        listCurrentContactPointLinks: jest.fn(),
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: {
        label: 'mobile',
        value: '2605551221',
        verificationStatus: 'verified',
      },
    })).resolves.toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-legacy-21',
          contactPoint: {
            value: '+12605551221',
          },
        },
      },
    });
  });

  it('preserves shared-contact no-auto-merge guardrails when PeopleCore has a single current link', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-22', '+12605551222')],
      async () => [buildNeighbor('neighbor-legacy-22', '+12605551222')],
      {
        listContactPointsByNormalizedValue: async () => [
          buildContactPoint('contact-point-22', '+12605551222'),
        ],
        listCurrentContactPointLinks: async () => [
          buildContactPointLink('contact-point-22', 'person-22'),
        ],
      } as any,
    );

    await expect(adapter.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      idempotencyKey: 'identity-match:no-auto-merge-shared',
      contactPoint: {
        label: 'mobile',
        value: '2605551222',
        isShared: true,
        verificationStatus: 'verified',
      },
    })).resolves.toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-legacy-22',
          decision: 'NO_AUTO_MERGE',
          autoMergeAllowed: false,
          contactPoint: {
            value: '+12605551222',
            isShared: true,
          },
        },
      },
    });
    expect(ambiguityEventsModule.createIdentityAmbiguityEvent).not.toHaveBeenCalled();
  });
});
