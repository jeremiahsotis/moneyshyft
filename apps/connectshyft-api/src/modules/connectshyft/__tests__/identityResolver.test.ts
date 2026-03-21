import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryNeighbor,
} from '../identityBoundary';
import { ConnectShyftSubjectResolver } from '../identityResolver';
import { AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter } from '../peoplecoreIdentityAdapter';

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

const buildResolver = (
  neighborsByTenant: Record<string, ConnectShyftIdentityBoundaryNeighbor[]>,
  lookupByTenantAndPhone: Record<string, Record<string, ConnectShyftIdentityBoundaryNeighbor[]>> = {},
): ConnectShyftSubjectResolver => {
  const adapter = new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
    async (tenantId) => neighborsByTenant[tenantId] || [],
    async (tenantId, normalizedContactPointValue) =>
      lookupByTenantAndPhone[tenantId]?.[normalizedContactPointValue]
      || (neighborsByTenant[tenantId] || []).filter((neighbor) =>
        neighbor.phones.some((phone) => phone.value === normalizedContactPointValue)),
  );

  return new ConnectShyftSubjectResolver(adapter);
};

describe('connectshyft identity resolver', () => {
  it('returns single_match through the PeopleCore seam while preserving current resolver behavior', async () => {
    const peopleCoreService = {
      listContactPointsByNormalizedValue: jest.fn(async () => [
        {
          id: 'contact-point-1',
          tenantId: 'tenant-a',
          type: 'phone',
          normalizedValue: '+12605551216',
          status: 'active_personal',
          firstSeenAt: '2026-03-21T12:00:00.000Z',
          lastSeenAt: '2026-03-21T12:00:00.000Z',
          suspectedShared: false,
          confirmedShared: false,
          reassignmentSuspected: false,
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      ]),
      listCurrentContactPointLinks: jest.fn(async () => [
        {
          id: 'link-1',
          contactPointId: 'contact-point-1',
          subjectType: 'person',
          subjectId: 'person-1',
          linkType: 'primary',
          confidenceBand: 'high',
          isCurrent: true,
          isPrimary: true,
          manuallyConfirmed: false,
          firstLinkedAt: '2026-03-21T12:00:00.000Z',
          linkedBy: 'system',
          createdAt: '2026-03-21T12:00:00.000Z',
          updatedAt: '2026-03-21T12:00:00.000Z',
        },
      ]),
    };
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-1', '+12605551216')],
      async () => [buildNeighbor('neighbor-1', '+12605551216')],
      peopleCoreService as any,
    );
    const resolver = new ConnectShyftSubjectResolver(adapter);

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '(260) 555-1216',
    })).resolves.toEqual({
      type: 'single_match',
      neighborId: 'neighbor-1',
      normalizedContactPoint: '+12605551216',
    });

    expect(peopleCoreService.listContactPointsByNormalizedValue).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      type: 'phone',
      normalizedValue: '+12605551216',
    });
  });

  it('characterizes PeopleCore and legacy disagreement as multiple_matches through the resolver seam', async () => {
    const adapter = new AsyncConnectShyftPeopleCoreIdentityBoundaryAdapter(
      async () => [buildNeighbor('neighbor-legacy-a', '+12605551218')],
      async () => [buildNeighbor('neighbor-legacy-b', '+12605551218')],
      {
        listContactPointsByNormalizedValue: async () => [
          {
            id: 'contact-point-18',
            tenantId: 'tenant-a',
            type: 'phone',
            normalizedValue: '+12605551218',
            status: 'active_personal',
            firstSeenAt: '2026-03-21T12:00:00.000Z',
            lastSeenAt: '2026-03-21T12:00:00.000Z',
            suspectedShared: false,
            confirmedShared: false,
            reassignmentSuspected: false,
            createdAt: '2026-03-21T12:00:00.000Z',
            updatedAt: '2026-03-21T12:00:00.000Z',
          },
        ],
        listCurrentContactPointLinks: async () => [
          {
            id: 'link-18',
            contactPointId: 'contact-point-18',
            subjectType: 'person',
            subjectId: 'person-18',
            linkType: 'primary',
            confidenceBand: 'high',
            isCurrent: true,
            isPrimary: true,
            manuallyConfirmed: false,
            firstLinkedAt: '2026-03-21T12:00:00.000Z',
            linkedBy: 'system',
            createdAt: '2026-03-21T12:00:00.000Z',
            updatedAt: '2026-03-21T12:00:00.000Z',
          },
        ],
      } as any,
    );
    const resolver = new ConnectShyftSubjectResolver(adapter);

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '(260) 555-1218',
    })).resolves.toEqual({
      type: 'multiple_matches',
      candidateNeighborIds: ['neighbor-legacy-b'],
      normalizedContactPoint: '+12605551218',
    });
  });

  it('passes hook context into the seam for inbound no-match handling', async () => {
    const evaluateMatch = jest.fn(async () => ({
      ok: true as const,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH' as const,
      httpStatus: 200 as const,
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE' as const,
          reason: 'NO_EXACT_CONTACT_POINT_MATCH' as const,
          autoMergeAllowed: false,
          contactPoint: {
            value: '+12605551217',
            isShared: false,
            verificationStatus: 'verified' as const,
          },
          matchedNeighborId: null,
          candidateCount: 0,
          candidateNeighborIds: [],
          exactMatches: [],
        },
        idempotency: {
          key: 'inbound-subject:tenant-a:org-a:(260)555-1217',
          semantics: 'REPLAY_SAFE' as const,
        },
      },
    }));
    const resolver = new ConnectShyftSubjectResolver({
      evaluateMatch,
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '(260) 555-1217',
    })).resolves.toEqual({
      type: 'no_match',
      normalizedContactPoint: '+12605551217',
    });

    expect(evaluateMatch).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      hookContext: {
        createProvisionalOnNoMatch: true,
        createResolverReviewOnAmbiguous: true,
        triggerSourceType: 'connectshyft_inbound_subject_resolution',
        requestedByUserId: 'system-connectshyft-identity-seam',
      },
    }));
  });

  it('returns single_match for a unique tenant-scoped phone match', async () => {
    const resolver = buildResolver({
      'tenant-a': [
        buildNeighbor('neighbor-1', '+12605551212'),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '+12605551212',
    })).resolves.toEqual({
      type: 'single_match',
      neighborId: 'neighbor-1',
      normalizedContactPoint: '+12605551212',
    });
  });

  it('normalizes canonical formatting variants before resolving a unique phone match', async () => {
    const resolver = buildResolver({
      'tenant-a': [
        buildNeighbor('neighbor-1', '+12605551212'),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '(260) 555-1212',
    })).resolves.toEqual({
      type: 'single_match',
      neighborId: 'neighbor-1',
      normalizedContactPoint: '+12605551212',
    });
  });

  it('returns no_match when the current tenant has no exact phone match', async () => {
    const resolver = buildResolver({
      'tenant-a': [
        buildNeighbor('neighbor-1', '+12605550000'),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '+12605551212',
    })).resolves.toEqual({
      type: 'no_match',
      normalizedContactPoint: '+12605551212',
    });
  });

  it('returns multiple_matches when multiple neighbors share the same phone', async () => {
    const resolver = buildResolver({
      'tenant-a': [
        buildNeighbor('neighbor-1', '+12605551212'),
        buildNeighbor('neighbor-2', '+12605551212'),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '+12605551212',
    })).resolves.toEqual({
      type: 'multiple_matches',
      candidateNeighborIds: ['neighbor-1', 'neighbor-2'],
      normalizedContactPoint: '+12605551212',
    });
  });

  it('returns no_match when deleted-only phone rows are excluded from active lookup', async () => {
    const resolver = buildResolver(
      {
        'tenant-a': [
          buildNeighbor('neighbor-deleted-shadow', '+12605551213'),
        ],
      },
      {
        'tenant-a': {
          '+12605551213': [],
        },
      },
    );

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '+1 (260) 555-1213',
    })).resolves.toEqual({
      type: 'no_match',
      normalizedContactPoint: '+12605551213',
    });
  });

  it('returns single_match for a unique shared contact even when auto-merge remains blocked', async () => {
    const resolver = buildResolver({
      'tenant-a': [
        buildNeighbor('neighbor-1', '+12605551215', {
          isShared: true,
        }),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '(260) 555-1215',
    })).resolves.toEqual({
      type: 'single_match',
      neighborId: 'neighbor-1',
      normalizedContactPoint: '+12605551215',
    });
  });

  it('returns single_match when active lookup excludes deleted duplicates and keeps the current owner', async () => {
    const currentOwner = buildNeighbor('neighbor-current', '+12605551214');
    const deletedShadow = buildNeighbor('neighbor-deleted-shadow', '+12605551214');
    const resolver = buildResolver(
      {
        'tenant-a': [
          currentOwner,
          deletedShadow,
        ],
      },
      {
        'tenant-a': {
          '+12605551214': [currentOwner],
        },
      },
    );

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '260.555.1214',
    })).resolves.toEqual({
      type: 'single_match',
      neighborId: 'neighbor-current',
      normalizedContactPoint: '+12605551214',
    });
  });

  it('treats other-tenant-only matches as no_match for the current tenant', async () => {
    const resolver = buildResolver({
      'tenant-a': [],
      'tenant-b': [
        buildNeighbor('neighbor-foreign', '+12605551212'),
      ],
    });

    await expect(resolver.resolveSubjectByContactPoint({
      tenantId: 'tenant-a',
      orgUnitId: 'org-a',
      contactPoint: '+12605551212',
    })).resolves.toEqual({
      type: 'no_match',
      normalizedContactPoint: '+12605551212',
    });
  });
});
