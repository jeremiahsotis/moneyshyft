import {
  ConnectShyftNeighborService,
  InMemoryConnectShyftNeighborStore,
} from '../modules/connectshyft/neighbors';

describe('connectshyft identity dedupe decision matrix', () => {
  let store: InMemoryConnectShyftNeighborStore;
  let service: ConnectShyftNeighborService;

  beforeEach(() => {
    store = new InMemoryConnectShyftNeighborStore();
    service = new ConnectShyftNeighborService(store);
  });

  it('allows auto-merge only for verified non-shared exact contact-point matches', () => {
    const created = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: false,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!created.ok) {
      throw new Error('Expected seed neighbor creation to succeed');
    }

    const evaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+1 (260) 555-0199',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    expect(evaluated).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_AUTO_MERGE_ALLOWED',
      data: {
        identityMatch: {
          decision: 'AUTO_MERGE_ALLOWED',
          reason: 'VERIFIED_NON_SHARED_EXACT_CONTACT_POINT',
          autoMergeAllowed: true,
          matchedNeighborId: created.data.neighbor.neighborId,
          candidateCount: 1,
        },
      },
    });
  });

  it('never auto-merges shared or unverified contact points', () => {
    const sharedCreated = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Shared',
      lastName: 'Identity',
      phones: [
        {
          label: 'mobile',
          value: '+12605550200',
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!sharedCreated.ok) {
      throw new Error('Expected shared seed neighbor creation to succeed');
    }

    const sharedEvaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550200',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    expect(sharedEvaluated).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE',
          reason: 'MATCH_CONTACT_SHARED',
          autoMergeAllowed: false,
        },
      },
    });

    const verifiedCreated = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Verified',
      lastName: 'Identity',
      phones: [
        {
          label: 'mobile',
          value: '+12605550201',
          isShared: false,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!verifiedCreated.ok) {
      throw new Error('Expected verified seed neighbor creation to succeed');
    }

    const unverifiedInputEvaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550201',
        isShared: false,
        verificationStatus: 'unverified',
      },
    });

    expect(unverifiedInputEvaluated).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_AUTO_MERGE',
      data: {
        identityMatch: {
          decision: 'NO_AUTO_MERGE',
          reason: 'INPUT_CONTACT_UNVERIFIED',
          autoMergeAllowed: false,
        },
      },
    });
  });

  it('returns IDENTITY_MATCH_AMBIGUOUS with manual-resolution context for multi-match contacts', () => {
    const first = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'First',
      lastName: 'Match',
      phones: [
        {
          label: 'mobile',
          value: '+12605550303',
          isShared: false,
          verificationStatus: 'verified',
        },
      ],
    });

    const second = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Second',
      lastName: 'Match',
      phones: [
        {
          label: 'mobile',
          value: '+12605550303',
          isShared: false,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!first.ok || !second.ok) {
      throw new Error('Expected duplicate-contact seed creation to succeed');
    }

    const evaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550303',
        isShared: false,
        verificationStatus: 'verified',
      },
    });

    expect(evaluated).toMatchObject({
      ok: false,
      code: 'IDENTITY_MATCH_AMBIGUOUS',
      data: {
        identityMatch: {
          decision: 'AMBIGUOUS',
          reason: 'MULTIPLE_EXACT_CONTACT_POINT_MATCHES',
          autoMergeAllowed: false,
          candidateCount: 2,
        },
        manualResolution: {
          required: true,
          reasonCode: 'IDENTITY_MATCH_AMBIGUOUS',
          nextAction: 'manual-merge',
          mergeEndpoint: '/api/v1/connectshyft/neighbors/merge',
        },
      },
    });
  });
});
