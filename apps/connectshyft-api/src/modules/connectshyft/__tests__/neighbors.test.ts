import {
  AsyncConnectShyftNeighborService,
  ConnectShyftNeighborService,
  InMemoryConnectShyftNeighborStore,
} from '../neighbors';

describe('connectshyft neighbor service', () => {
  const originalEnv = process.env;
  let store: InMemoryConnectShyftNeighborStore;
  let service: ConnectShyftNeighborService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    store = new InMemoryConnectShyftNeighborStore();
    service = new ConnectShyftNeighborService(store);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates tenant-scoped neighbors with normalized phone values', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+1 (260) 555-0199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighbor: {
          tenantId: 'tenant-connectshyft-alpha',
          orgUnitId: 'org-connectshyft-alpha-east',
          firstName: 'Mina',
          lastName: 'Lopez',
          prefersTexting: 'YES',
          phones: [
            expect.objectContaining({
              label: 'mobile',
              value: '+12605550199',
              displayNational: '(260) 555-0199',
              countryCode: '1',
              nationalNumber: '2605550199',
              sortOrder: 0,
              isPrimary: true,
            }),
          ],
        },
      },
    });

    if (!result.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const scopedNeighbors = store.listByOrgUnit(
      'tenant-connectshyft-alpha',
      'org-connectshyft-alpha-east',
    );
    expect(scopedNeighbors).toHaveLength(1);
    expect(scopedNeighbors[0].neighborId).toBe(result.data.neighbor.neighborId);
    expect(scopedNeighbors[0].prefersTexting).toBe('YES');
  });

  it('creates tenant-scoped neighbors from seven-digit local input when a default area code is configured', () => {
    process.env.CONNECTSHYFT_PHONE_DEFAULT_AREA_CODE = '260';

    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '5550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighbor: {
          phones: [
            expect.objectContaining({
              value: '+12605550199',
              displayNational: '(260) 555-0199',
              countryCode: '1',
              nationalNumber: '2605550199',
            }),
          ],
        },
      },
    });
  });

  it('creates neighbors with explicit canonical texting preference values', () => {
    const optedOut = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Nora',
      lastName: 'OptOut',
      prefersTexting: 'NO',
      phones: [
        {
          label: 'mobile',
          value: '+12605550188',
        },
      ],
    });
    const unknown = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Uma',
      lastName: 'Unknown',
      prefersTexting: 'UNKNOWN',
      phones: [
        {
          label: 'mobile',
          value: '+12605550177',
        },
      ],
    });

    expect(optedOut).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'NO',
        },
      },
    });
    expect(unknown).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'UNKNOWN',
        },
      },
    });
  });

  it('creates minimal inbound neighbors with UNKNOWN texting preference and an active primary phone', () => {
    const result = service.createNeighborFromInbound({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      phone: '+1 (260) 555-0181',
    });

    expect(result).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighbor: {
          firstName: '',
          lastName: '',
          prefersTexting: 'UNKNOWN',
          phones: [
            expect.objectContaining({
              value: '+12605550181',
              validationStatus: 'valid',
              isPrimary: true,
              isActive: true,
            }),
          ],
        },
      },
    });
  });

  it('promotes UNKNOWN texting preference to YES on inbound SMS only', () => {
    const unknownNeighbor = service.createNeighborFromInbound({
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      phone: '+12605550182',
    });
    if (!unknownNeighbor.ok) {
      throw new Error('Expected inbound neighbor create to succeed');
    }

    const optedOutNeighbor = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Nora',
      lastName: 'OptOut',
      prefersTexting: 'NO',
      phones: [
        {
          label: 'mobile',
          value: '+12605550183',
        },
      ],
    });
    if (!optedOutNeighbor.ok) {
      throw new Error('Expected opted-out neighbor create to succeed');
    }

    const promoted = service.applyInboundSmsTextingPreference({
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: unknownNeighbor.data.neighbor.neighborId,
    });
    const preserved = service.applyInboundSmsTextingPreference({
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: optedOutNeighbor.data.neighbor.neighborId,
    });

    expect(promoted).toMatchObject({
      ok: true,
      updated: true,
      neighbor: {
        neighborId: unknownNeighbor.data.neighbor.neighborId,
        prefersTexting: 'YES',
      },
    });
    expect(preserved).toMatchObject({
      ok: true,
      updated: false,
      neighbor: {
        neighborId: optedOutNeighbor.data.neighbor.neighborId,
        prefersTexting: 'NO',
      },
    });
  });

  it('refuses create requests that omit phone entries', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Noah',
      lastName: 'Harper',
      phones: [],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'phones',
            reason: 'REQUIRED',
          }),
        ],
      },
    });
  });

  it('refuses create requests with invalid phone formats', () => {
    const result = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Ari',
      lastName: 'Quinn',
      phones: [
        {
          label: 'mobile',
          value: '260-ABC-0199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'phones',
            reason: 'INVALID_FORMAT',
          }),
        ],
      },
    });
  });

  it('refuses callers without neighbor-create capability', () => {
    const result = service.createNeighbor({
      actorRoles: ['TENANT_VIEWER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Ari',
      lastName: 'Quinn',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
    });
  });

  it('rejects neighbor id conflicts at persistence layer', () => {
    const first = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      neighborId: 'neighbor-b1-conflict',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    const second = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-bravo',
      orgUnitId: 'org-connectshyft-bravo-north',
      neighborId: 'neighbor-b1-conflict',
      firstName: 'Jules',
      lastName: 'North',
      phones: [
        {
          label: 'mobile',
          value: '+12605550200',
        },
      ],
    });

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_CONFLICT',
    });
  });

  it('resolves and lists neighbors tenant-wide with deterministic shared-phone indicators', () => {
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
          isShared: true,
        },
        {
          label: 'home',
          value: '+12605550200',
          isShared: false,
        },
      ],
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const resolvedFromPeerOrgUnit = service.resolveNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
    });
    expect(resolvedFromPeerOrgUnit).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      data: {
        neighbor: {
          neighborId: created.data.neighbor.neighborId,
          phones: [
            expect.objectContaining({
              label: 'mobile',
              isShared: true,
            }),
            expect.objectContaining({
              label: 'home',
              isShared: false,
            }),
          ],
        },
      },
    });

    const listResult = service.listNeighbors({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
    });
    expect(listResult).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
      data: {
        neighbors: [
          expect.objectContaining({
            neighborId: created.data.neighbor.neighborId,
            phones: expect.arrayContaining([
              expect.objectContaining({
                label: 'mobile',
                isShared: true,
              }),
              expect.objectContaining({
                label: 'home',
                isShared: false,
              }),
            ]),
          }),
        ],
      },
    });
  });

  it('updates neighbor identity, shared-phone toggles, and texting preference across YES, NO, and UNKNOWN', () => {
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
          isShared: true,
        },
        {
          label: 'home',
          value: '+12605550200',
          isShared: false,
        },
      ],
    });

    if (!created.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const updated = service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
      relationshipValidated: true,
      firstName: 'Mina Shared',
      lastName: 'Lopez Shared',
      prefersTexting: 'NO',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: false,
        },
        {
          label: 'home',
          value: '+12605550200',
          isShared: true,
        },
      ],
    });

    expect(updated).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      data: {
        neighbor: {
          firstName: 'Mina Shared',
          lastName: 'Lopez Shared',
          prefersTexting: 'NO',
          phones: [
            expect.objectContaining({
              label: 'mobile',
              isShared: false,
            }),
            expect.objectContaining({
              label: 'home',
              isShared: true,
            }),
          ],
        },
      },
    });

    const updatedToUnknown = service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
      relationshipValidated: true,
      firstName: 'Mina Shared',
      lastName: 'Lopez Shared',
      prefersTexting: 'UNKNOWN',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: false,
        },
        {
          label: 'home',
          value: '+12605550200',
          isShared: true,
        },
      ],
    });
    expect(updatedToUnknown).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'UNKNOWN',
        },
      },
    });

    const updatedBackToYes = service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
      relationshipValidated: true,
      firstName: 'Mina Shared',
      lastName: 'Lopez Shared',
      prefersTexting: 'YES',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: false,
        },
        {
          label: 'home',
          value: '+12605550200',
          isShared: true,
        },
      ],
    });
    expect(updatedBackToYes).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'YES',
        },
      },
    });

    const resolved = service.resolveNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
    });
    expect(resolved).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'YES',
        },
      },
    });
  });

  it('requires relationship validation for non-tenant-privileged updates', () => {
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
          isShared: true,
        },
      ],
    });

    if (!created.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const updated = service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: created.data.neighbor.neighborId,
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: true,
        },
      ],
    });

    expect(updated).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED',
    });
  });

  it('returns not-found for cross-tenant neighbor access attempts without revealing neighbor existence', () => {
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
          isShared: true,
        },
      ],
    });

    if (!created.ok) {
      throw new Error('Expected neighbor create to succeed');
    }

    const crossTenantResolved = service.resolveNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-bravo',
      neighborId: created.data.neighbor.neighborId,
    });
    expect(crossTenantResolved).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
    });

    const crossTenantUpdated = service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-bravo',
      neighborId: created.data.neighbor.neighborId,
      relationshipValidated: true,
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: false,
        },
      ],
    });
    expect(crossTenantUpdated).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
    });
  });

  it('merges source neighbor into survivor for authorized roles with exact irreversible confirmation', () => {
    const sourceCreated = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Source',
      lastName: 'Neighbor',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: true,
        },
      ],
    });
    const survivorCreated = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Survivor',
      lastName: 'Neighbor',
      phones: [
        {
          label: 'home',
          value: '+12605550200',
          isShared: false,
        },
      ],
    });

    if (!sourceCreated.ok || !survivorCreated.ok) {
      throw new Error('Expected seed neighbors to be created');
    }

    const merged = service.mergeNeighbor({
      actorRoles: ['TENANT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      sourceNeighborId: sourceCreated.data.neighbor.neighborId,
      survivorNeighborId: survivorCreated.data.neighbor.neighborId,
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: 'IRREVERSIBLE MERGE',
      },
      reason: 'duplicate-identity',
    });

    expect(merged).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGED',
      data: {
        merge: {
          sourceNeighborId: sourceCreated.data.neighbor.neighborId,
          survivorNeighborId: survivorCreated.data.neighbor.neighborId,
          irreversibleConfirmed: true,
        },
      },
    });

    const sourceAfter = service.resolveNeighbor({
      actorRoles: ['TENANT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: sourceCreated.data.neighbor.neighborId,
    });
    expect(sourceAfter).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
    });

    const survivorAfter = service.resolveNeighbor({
      actorRoles: ['TENANT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: survivorCreated.data.neighbor.neighborId,
    });
    expect(survivorAfter).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      data: {
        neighbor: {
          phones: expect.arrayContaining([
            expect.objectContaining({ value: '+12605550199' }),
            expect.objectContaining({ value: '+12605550200' }),
          ]),
        },
      },
    });
  });

  it('refuses merge for unauthorized roles', () => {
    const merged = service.mergeNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      sourceNeighborId: 'neighbor-source',
      survivorNeighborId: 'neighbor-survivor',
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: 'IRREVERSIBLE MERGE',
      },
      reason: 'unauthorized-probe',
    });

    expect(merged).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN',
    });
  });

  it('refuses merge for tenant staff role', () => {
    const merged = service.mergeNeighbor({
      actorRoles: ['TENANT_STAFF'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      sourceNeighborId: 'neighbor-source',
      survivorNeighborId: 'neighbor-survivor',
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: 'IRREVERSIBLE MERGE',
      },
      reason: 'tenant-staff-role-probe',
    });

    expect(merged).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_FORBIDDEN',
    });
  });

  it('refuses merge when irreversible confirmation phrase is malformed', () => {
    const merged = service.mergeNeighbor({
      actorRoles: ['TENANT_ADMIN'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      sourceNeighborId: 'neighbor-source',
      survivorNeighborId: 'neighbor-survivor',
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: ' irreversible merge ',
      },
      reason: 'confirmation-probe',
    });

    expect(merged).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_CONFIRMATION_REQUIRED',
    });
  });

  it('marks verified non-shared exact contact matches as auto-merge eligible', () => {
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
      throw new Error('Expected neighbor create to succeed');
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
          candidateNeighborIds: [created.data.neighbor.neighborId],
        },
      },
    });
  });

  it('returns no-auto-merge outcomes for shared or unverified contact points', () => {
    const sharedCreated = service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Shared',
      lastName: 'Match',
      phones: [
        {
          label: 'mobile',
          value: '+12605550201',
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!sharedCreated.ok) {
      throw new Error('Expected shared neighbor create to succeed');
    }

    const sharedEvaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550201',
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
      lastName: 'Match',
      phones: [
        {
          label: 'mobile',
          value: '+12605550202',
          isShared: false,
          verificationStatus: 'verified',
        },
      ],
    });

    if (!verifiedCreated.ok) {
      throw new Error('Expected verified neighbor create to succeed');
    }

    const unverifiedInputEvaluated = service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550202',
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

  it('returns deterministic ambiguous refusal with manual-resolution context for multi-match contacts', () => {
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
      throw new Error('Expected duplicate contact neighbors to be created for ambiguity test');
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

  it('fails fast when sync service is wired to an async-only boundary adapter', () => {
    const asyncOnlyBoundary = {
      evaluateMatch: async () => ({
        ok: true as const,
        code: 'CONNECTSHYFT_IDENTITY_MATCH_NO_MATCH' as const,
        httpStatus: 200 as const,
        data: {
          identityMatch: {
            decision: 'NO_AUTO_MERGE' as const,
            reason: 'NO_EXACT_CONTACT_POINT_MATCH' as const,
            autoMergeAllowed: false,
            contactPoint: {
              value: '+12605550000',
              isShared: false,
              verificationStatus: 'verified' as const,
            },
            matchedNeighborId: null,
            candidateCount: 0,
            candidateNeighborIds: [],
            exactMatches: [],
          },
          idempotency: {
            key: 'identity-replay-key-async',
            semantics: 'REPLAY_SAFE' as const,
          },
        },
      }),
    };

    const syncService = new ConnectShyftNeighborService(
      new InMemoryConnectShyftNeighborStore(),
      asyncOnlyBoundary as any,
    );

    expect(() => syncService.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550000',
        isShared: false,
        verificationStatus: 'verified',
      },
    })).toThrow('synchronous identity boundary adapter');
  });
});

describe('connectshyft async neighbor service', () => {
  it('refuses create requests when persistence storage is unavailable', async () => {
    const unavailableStore = {
      createNeighbor: jest.fn(async () => {
        const error = new Error('relation does not exist') as Error & { code: string };
        error.code = '42P01';
        throw error;
      }),
    };

    const service = new AsyncConnectShyftNeighborService(unavailableStore as any);

    const result = await service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE',
    });
  });

  it('rethrows unexpected persistence errors', async () => {
    const unavailableStore = {
      createNeighbor: jest.fn(async () => {
        const error = new Error('db connection aborted') as Error & { code: string };
        error.code = 'XX000';
        throw error;
      }),
    };

    const service = new AsyncConnectShyftNeighborService(unavailableStore as any);

    await expect(
      service.createNeighbor({
        actorRoles: ['ORGUNIT_MEMBER'],
        tenantId: 'tenant-connectshyft-alpha',
        orgUnitId: 'org-connectshyft-alpha-east',
        firstName: 'Mina',
        lastName: 'Lopez',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      }),
    ).rejects.toThrow('db connection aborted');
  });

  it('returns persistence-unavailable refusals for schema-mismatch errors', async () => {
    const schemaMismatchStore = {
      createNeighbor: jest.fn(async () => {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }),
      resolveNeighborById: jest.fn(async () => {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }),
      listByTenant: jest.fn(async () => {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }),
      listIdentityBoundaryNeighborsByPhoneValue: jest.fn(async () => {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }),
      updateNeighbor: jest.fn(async () => {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }),
    };

    const service = new AsyncConnectShyftNeighborService(schemaMismatchStore as any);

    const created = await service.createNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      orgUnitId: 'org-connectshyft-alpha-east',
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });
    expect(created).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_PERSISTENCE_UNAVAILABLE',
    });

    const resolved = await service.resolveNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: 'neighbor-b2-missing-column',
    });
    expect(resolved).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
    });

    const listed = await service.listNeighbors({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
    });
    expect(listed).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
    });

    const updated = await service.updateNeighbor({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      neighborId: 'neighbor-b2-missing-column',
      relationshipValidated: true,
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
        },
      ],
    });
    expect(updated).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
    });

    const identityMatch = await service.evaluateIdentityMatch({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: 'tenant-connectshyft-alpha',
      contactPoint: {
        label: 'mobile',
        value: '+12605550199',
        isShared: false,
        verificationStatus: 'verified',
      },
    });
    expect(identityMatch).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PERSISTENCE_UNAVAILABLE',
    });
  });
});
