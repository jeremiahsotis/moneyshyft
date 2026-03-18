import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  type ConnectShyftIdentityBoundaryNeighbor,
} from '../identityBoundary';
import { ConnectShyftSubjectResolver } from '../identityResolver';

const buildNeighbor = (
  neighborId: string,
  value: string,
): ConnectShyftIdentityBoundaryNeighbor => ({
  neighborId,
  phones: [
    {
      phoneId: `${neighborId}-phone-1`,
      value,
      isShared: false,
      verificationStatus: 'verified',
    },
  ],
});

const buildResolver = (
  neighborsByTenant: Record<string, ConnectShyftIdentityBoundaryNeighbor[]>,
): ConnectShyftSubjectResolver => {
  const adapter = new AsyncInProcessConnectShyftIdentityBoundaryAdapter(
    async (tenantId) => neighborsByTenant[tenantId] || [],
    async (tenantId, normalizedContactPointValue) =>
      (neighborsByTenant[tenantId] || []).filter((neighbor) =>
        neighbor.phones.some((phone) => phone.value === normalizedContactPointValue)),
  );

  return new ConnectShyftSubjectResolver(adapter);
};

describe('connectshyft identity resolver', () => {
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
