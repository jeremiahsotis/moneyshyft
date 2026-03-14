import {
  evaluateConnectShyftIdentityBoundary,
  type ConnectShyftIdentityBoundaryNeighbor,
} from '../identityBoundary';

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

describe('connectshyft identity boundary', () => {
  it('matches natural ten-digit input to canonical stored phone identity', () => {
    const result = evaluateConnectShyftIdentityBoundary({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '260-555-1212',
        verificationStatus: 'verified',
      },
    }, [
      buildNeighbor('neighbor-1', '+12605551212'),
    ]);

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-1',
          decision: 'AUTO_MERGE_ALLOWED',
          reason: 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT',
          contactPoint: {
            value: '+12605551212',
          },
        },
      },
    });
  });

  it('returns no-match when no canonical phone identity exists', () => {
    const result = evaluateConnectShyftIdentityBoundary({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '2605551212',
        verificationStatus: 'verified',
      },
    }, [
      buildNeighbor('neighbor-1', '+12605550000'),
    ]);

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH',
      data: {
        identityMatch: {
          matchedNeighborId: null,
          decision: 'NO_AUTO_MERGE',
          reason: 'NO_EXACT_CONTACT_POINT_MATCH',
        },
      },
    });
  });

  it('returns ambiguous when multiple neighbors share the same canonical phone identity', () => {
    const result = evaluateConnectShyftIdentityBoundary({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '(260) 555-1212',
        verificationStatus: 'verified',
      },
    }, [
      buildNeighbor('neighbor-1', '+12605551212'),
      buildNeighbor('neighbor-2', '+12605551212'),
    ]);

    expect(result).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
          candidateNeighborIds: ['neighbor-1', 'neighbor-2'],
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
        },
      },
    });
  });

  it('refuses auto-merge when the matched canonical phone identity is shared', () => {
    const result = evaluateConnectShyftIdentityBoundary({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '2605551212',
        verificationStatus: 'verified',
      },
    }, [
      buildNeighbor('neighbor-1', '+12605551212', { isShared: true }),
    ]);

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      data: {
        identityMatch: {
          matchedNeighborId: 'neighbor-1',
          decision: 'NO_AUTO_MERGE',
          reason: 'MATCH_CONTACT_SHARED',
          autoMergeAllowed: false,
        },
      },
    });
  });
});
