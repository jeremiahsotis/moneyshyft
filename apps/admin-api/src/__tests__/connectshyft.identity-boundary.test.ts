import {
  AsyncInProcessConnectShyftIdentityBoundaryAdapter,
  InProcessConnectShyftIdentityBoundaryAdapter,
} from '../modules/connectshyft/identityBoundary';

describe('connectshyft identity boundary contracts', () => {
  const buildNeighbors = () => [
    {
      neighborId: 'neighbor-a',
      phones: [
        {
          phoneId: 'phone-a',
          value: '+12605550199',
          isShared: false,
          verificationStatus: 'verified' as const,
        },
      ],
    },
  ];

  it('returns explicit success contract with replay-safe idempotency metadata', () => {
    const boundary = new InProcessConnectShyftIdentityBoundaryAdapter(() => buildNeighbors());

    const first = boundary.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+1 (260) 555-0199',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    const second = boundary.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550199',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    expect(first).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          decision: 'AUTO_MERGE_ALLOWED',
          reason: 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT',
          autoMergeAllowed: true,
          matchedNeighborId: 'neighbor-a',
        },
        idempotency: {
          semantics: 'REPLAY_SAFE',
        },
      },
    });

    if (!first.ok || !second.ok) {
      throw new Error('Expected replay-safe identity-match success contract');
    }

    expect(first.data.idempotency.key).toBe(second.data.idempotency.key);
  });

  it('returns ambiguous refusal with explicit manual-resolution and idempotency contracts', () => {
    const boundary = new InProcessConnectShyftIdentityBoundaryAdapter(() => [
      {
        neighborId: 'neighbor-a',
        phones: [
          {
            phoneId: 'phone-a',
            value: '+12605550303',
            isShared: false,
            verificationStatus: 'verified' as const,
          },
        ],
      },
      {
        neighborId: 'neighbor-b',
        phones: [
          {
            phoneId: 'phone-b',
            value: '+12605550303',
            isShared: false,
            verificationStatus: 'verified' as const,
          },
        ],
      },
    ]);

    const evaluated = boundary.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550303',
        isShared: false,
        verificationStatus: 'verified',
      },
      idempotencyKey: 'identity-replay-key-001',
    });

    expect(evaluated).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
          autoMergeAllowed: false,
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          nextAction: 'manual-merge',
          mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
          candidateNeighborIds: ['neighbor-a', 'neighbor-b'],
        },
        idempotency: {
          key: 'identity-replay-key-001',
          semantics: 'REPLAY_SAFE',
        },
      },
    });
  });

  it('preserves contract parity for async in-process adapters', async () => {
    const boundary = new AsyncInProcessConnectShyftIdentityBoundaryAdapter(async () => buildNeighbors());

    const evaluated = await boundary.evaluateMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550199',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    expect(evaluated).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        idempotency: {
          semantics: 'REPLAY_SAFE',
        },
      },
    });
  });
});
