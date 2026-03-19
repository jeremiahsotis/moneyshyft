// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import * as BridgeSessionsModule from '../../../../modules/connectshyft/bridgeSessions';
import * as CanonicalEventsModule from '../../../../modules/connectshyft/canonicalEvents';
import { connectShyftNeighborServiceAsync } from '../../../../modules/connectshyft/neighbors';
import * as ReadContractsModule from '../../../../modules/connectshyft/readContracts';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || TEST_TENANT_ID;
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || TEST_ORG_UNIT_ID;
    const role = req.header('x-test-connectshyft-role') || 'ORGUNIT_MEMBER';
    const userId = req.header('x-test-connectshyft-user-id') || 'user-connectshyft-neighbors';

    req.user = {
      userId,
      email: `${userId}@connectshyft.test`,
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId,
      role,
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId;
    req.tenantContext = {
      tenantId,
      orgUnitId,
      scopeMode: 'ORG_UNIT',
      source: 'auth',
    };

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const buildHeaders = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'x-correlation-id': 'corr-connectshyft-neighbors',
  'x-test-connectshyft-flags': JSON.stringify({
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  }),
  'x-test-connectshyft-tenant-id': TEST_TENANT_ID,
  'x-test-connectshyft-orgunit-id': TEST_ORG_UNIT_ID,
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-neighbors',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify([TEST_ORG_UNIT_ID]),
  ...overrides,
});

describe('connectshyft neighbors routes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;
  let entitlementSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
    entitlementSpy = jest.spyOn(TenantModuleEntitlements, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'enabled',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'ConnectShyft entitlement enabled for tests.',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    entitlementSpy = jest.spyOn(TenantModuleEntitlements, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      moduleKey: 'connectshyft',
      enabled: true,
      reason: 'enabled',
      refusalCode: 'CONNECTSHYFT_ENTITLEMENT_ENABLED',
      message: 'ConnectShyft entitlement enabled for tests.',
    });
  });

  afterAll(() => {
    entitlementSpy.mockRestore();
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('returns standardized duplicate-phone refusal data for neighbor create', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_PHONE_DUPLICATE',
      message: 'That phone number is already assigned to another current neighbor.',
      data: {
        reason: 'duplicate_phone',
        fieldErrors: [
          {
            field: 'phones',
            reason: 'duplicate_phone',
            message: 'That phone number is already assigned to another current neighbor.',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Lopez',
        prefersTexting: 'YES',
        phones: [
          {
            label: 'mobile',
            value: '+1 (260) 555-0199',
            verificationStatus: 'verified',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PHONE_DUPLICATE',
      refusalType: 'business',
      data: {
        reason: 'duplicate_phone',
        fieldErrors: [
          {
            field: 'phones',
            reason: 'duplicate_phone',
          },
        ],
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('returns standardized duplicate-phone refusal data for neighbor update', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'updateNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_PHONE_DUPLICATE',
      message: 'That phone number is already assigned to another current neighbor.',
      data: {
        reason: 'duplicate_phone',
        fieldErrors: [
          {
            field: 'phones',
            reason: 'duplicate_phone',
            message: 'That phone number is already assigned to another current neighbor.',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/neighbors/neighbor-duplicate-update')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Lopez',
        prefersTexting: 'YES',
        phones: [
          {
            label: 'mobile',
            value: '+1 (260) 555-0199',
            verificationStatus: 'verified',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_PHONE_DUPLICATE',
      refusalType: 'business',
      data: {
        reason: 'duplicate_phone',
        fieldErrors: [
          {
            field: 'phones',
            reason: 'duplicate_phone',
          },
        ],
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('returns neighbor-create success when reusing a phone held only by a soft-deleted neighbor', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: {
          neighborId: 'neighbor-soft-delete-reuse',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Reused',
          lastName: 'Number',
          prefersTexting: 'YES',
          phones: [
            {
              phoneId: 'phone-soft-delete-reuse',
              label: 'mobile',
              value: '+12605550198',
              displayNational: '(260) 555-0198',
              countryCode: '1',
              nationalNumber: '2605550198',
              extension: null,
              validationStatus: 'valid',
              usageType: 'personal',
              source: 'user_entered',
              sortOrder: 0,
              isPrimary: true,
              isShared: false,
              verificationStatus: 'verified',
              isActive: true,
              createdAtUtc: '2026-03-18T12:00:00.000Z',
              updatedAtUtc: '2026-03-18T12:00:00.000Z',
            },
          ],
          createdAtUtc: '2026-03-18T12:00:00.000Z',
          updatedAtUtc: '2026-03-18T12:00:00.000Z',
        },
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Reused',
        lastName: 'Number',
        prefersTexting: 'YES',
        phones: [
          {
            label: 'mobile',
            value: '(260) 555-0198',
            verificationStatus: 'verified',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighborId: 'neighbor-soft-delete-reuse',
        neighbor: {
          phones: [
            expect.objectContaining({
              value: '+12605550198',
            }),
          ],
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('soft-deletes a neighbor only for tenant admins when irreversible confirmation is supplied', async () => {
    const softDeleteSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'softDeleteNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      httpStatus: 200,
      data: {
        alreadyDeleted: false,
        neighbor: {
          neighborId: 'neighbor-soft-delete-1001',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Deleted',
          lastName: 'Neighbor',
          prefersTexting: 'YES',
          isDeleted: true,
          deletedAtUtc: '2026-03-18T12:00:00.000Z',
          deletedByUserId: '33333333-3333-4333-8333-333333333333',
          phones: [
            {
              phoneId: 'phone-soft-delete-1001',
              label: 'mobile',
              value: '+12605550197',
              rawInput: '+12605550197',
              displayNational: '(260) 555-0197',
              countryCode: '1',
              nationalNumber: '2605550197',
              extension: null,
              validationStatus: 'valid',
              usageType: 'mobile',
              source: 'user_entered',
              sortOrder: 0,
              isPrimary: true,
              isShared: false,
              verificationStatus: 'verified',
              isActive: false,
              createdAtUtc: '2026-03-18T12:00:00.000Z',
              updatedAtUtc: '2026-03-18T12:00:00.000Z',
            },
          ],
          createdAtUtc: '2026-03-18T11:30:00.000Z',
          updatedAtUtc: '2026-03-18T12:00:00.000Z',
        },
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .delete('/api/v1/connectshyft/neighbors/neighbor-soft-delete-1001')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
        'x-test-connectshyft-user-id': '33333333-3333-4333-8333-333333333333',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      data: {
        neighborId: 'neighbor-soft-delete-1001',
        alreadyDeleted: false,
        neighbor: {
          isDeleted: true,
          deletedByUserId: '33333333-3333-4333-8333-333333333333',
          phones: [
            expect.objectContaining({
              value: '+12605550197',
              isActive: false,
            }),
          ],
        },
        sideEffectsPersisted: false,
        audit: {
          eventName: 'connectshyft.neighbor.soft_deleted',
        },
        outbox: {
          eventName: 'connectshyft.neighbor.soft_deleted',
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
    expect(softDeleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: 'neighbor-soft-delete-1001',
      actorUserId: '33333333-3333-4333-8333-333333333333',
      irreversibleConfirmation: true,
    }));
  });

  it('refuses neighbor soft delete when irreversible confirmation is missing', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'softDeleteNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED',
      message: 'Neighbor soft delete requires explicit irreversible confirmation.',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .delete('/api/v1/connectshyft/neighbors/neighbor-soft-delete-1002')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
        'x-test-connectshyft-user-id': '33333333-3333-4333-8333-333333333333',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED',
      refusalType: 'business',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('refuses neighbor soft delete when the caller is not tenant-privileged', async () => {
    const softDeleteSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'softDeleteNeighbor');

    const app = buildApp();
    const response = await request(app)
      .delete('/api/v1/connectshyft/neighbors/neighbor-soft-delete-1003')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
        'x-test-connectshyft-user-id': '33333333-3333-4333-8333-333333333333',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_FORBIDDEN',
      refusalType: 'business',
    });
    expect(softDeleteSpy).not.toHaveBeenCalled();
  });

  it('returns neighbor not found when soft delete targets an unknown neighbor', async () => {
    const softDeleteSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'softDeleteNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
      message: 'Neighbor was not found for this tenant.',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .delete('/api/v1/connectshyft/neighbors/neighbor-soft-delete-missing-1004')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
        'x-test-connectshyft-user-id': '33333333-3333-4333-8333-333333333333',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
      refusalType: 'business',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
    expect(softDeleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: 'neighbor-soft-delete-missing-1004',
      irreversibleConfirmation: true,
    }));
  });

  it('lists only active neighbors on the standard neighbors route', async () => {
    const listSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'listNeighbors').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
      httpStatus: 200,
      data: {
        neighbors: [
          {
            neighborId: 'neighbor-active-list-1005',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            firstName: 'Active',
            lastName: 'Neighbor',
            prefersTexting: 'YES',
            isDeleted: false,
            deletedAtUtc: null,
            deletedByUserId: null,
            phones: [],
            createdAtUtc: '2026-03-18T12:00:00.000Z',
            updatedAtUtc: '2026-03-18T12:00:00.000Z',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/neighbors')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
      data: {
        neighbors: [
          expect.objectContaining({
            neighborId: 'neighbor-active-list-1005',
            isDeleted: false,
          }),
        ],
      },
    });
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({
      actorRoles: ['TENANT_ADMIN'],
      tenantId: TEST_TENANT_ID,
    }));
  });

  it('allows tenant admins to request deleted neighbor detail through includeDeleted=true', async () => {
    const resolveSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      httpStatus: 200,
      data: {
        neighbor: {
          neighborId: 'neighbor-soft-delete-detail-1004',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Deleted',
          lastName: 'Detail',
          prefersTexting: 'YES',
          isDeleted: true,
          deletedAtUtc: '2026-03-18T12:05:00.000Z',
          deletedByUserId: '33333333-3333-4333-8333-333333333333',
          phones: [],
          createdAtUtc: '2026-03-18T11:00:00.000Z',
          updatedAtUtc: '2026-03-18T12:05:00.000Z',
        },
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/neighbors/neighbor-soft-delete-detail-1004')
      .query({
        includeDeleted: 'true',
      })
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
      data: {
        neighbor: {
          isDeleted: true,
          deletedAtUtc: '2026-03-18T12:05:00.000Z',
          deletedByUserId: '33333333-3333-4333-8333-333333333333',
        },
      },
    });
    expect(resolveSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: 'neighbor-soft-delete-detail-1004',
      includeDeleted: true,
    }));
  });

  it('keeps deleted neighbor detail hidden on the standard route without includeDeleted=true', async () => {
    const resolveSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'resolveNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
      message: 'Neighbor detail is unavailable for the requested orgUnit context.',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/neighbors/neighbor-soft-delete-hidden-1006')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_NOT_FOUND',
      refusalType: 'business',
    });
    expect(resolveSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: 'neighbor-soft-delete-hidden-1006',
      includeDeleted: false,
    }));
  });

  it('returns deleted-neighbor thread detail only through includeDeleted=true and clears operational actions', async () => {
    jest.spyOn(ReadContractsModule, 'resolveConnectShyftThreadDetailContractAsync').mockResolvedValue({
      threadId: 'thread-soft-delete-detail-1005',
      neighborId: 'neighbor-soft-delete-detail-1005',
      neighborDeleted: true,
      neighbor_deleted: true,
      neighborDeletedAtUtc: '2026-03-18T12:10:00.000Z',
      neighbor_deleted_at_utc: '2026-03-18T12:10:00.000Z',
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      state: 'CLAIMED',
      claimedByUserId: 'user-connectshyft-neighbors',
      claimed_by_user_id: 'user-connectshyft-neighbors',
      bucket: 'mine',
      escalationStage: 1,
      isNewUnread: false,
      priorityRank: 3,
      urgencyLabel: 'Needs attention soon',
      lastActivityAtUtc: '2026-03-18T12:12:00.000Z',
      lastInboundCsNumberId: 'cs-number-1005',
      last_inbound_cs_number_id: 'cs-number-1005',
      preferredOutboundCsNumberId: 'cs-number-2005',
      preferred_outbound_cs_number_id: 'cs-number-2005',
      preferredOutboundContext: {
        csNumberId: 'cs-number-2005',
        label: 'Deleted Neighbor Queue',
      },
      preferred_outbound_context: {
        cs_number_id: 'cs-number-2005',
        label: 'Deleted Neighbor Queue',
      },
      voicemailIndicator: false,
      voicemailLabel: null,
      summary: 'Deleted neighbor thread detail',
      actions: ['Call', 'Text', 'Close'],
      lifecycle: {
        reopenedByInbound: false,
      },
    } as any);
    jest.spyOn(CanonicalEventsModule, 'listConnectShyftCanonicalEvents').mockResolvedValue([]);
    jest.spyOn(BridgeSessionsModule, 'loadConnectShyftBridgeAggregateByThreadId').mockResolvedValue(null as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-detail-1005')
      .query({
        includeDeleted: 'true',
      })
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      data: {
        thread: {
          threadId: 'thread-soft-delete-detail-1005',
          neighbor_deleted: true,
          neighbor_deleted_at_utc: '2026-03-18T12:10:00.000Z',
          actions: [],
        },
      },
    });
  });

  it('keeps deleted-neighbor thread detail hidden without includeDeleted=true', async () => {
    const resolveSpy = jest
      .spyOn(ReadContractsModule, 'resolveConnectShyftThreadDetailContractAsync')
      .mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/threads/thread-soft-delete-hidden-1007')
      .set(buildHeaders({
        'x-test-connectshyft-role': 'TENANT_ADMIN',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      refusalType: 'business',
    });
    expect(resolveSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      threadId: 'thread-soft-delete-hidden-1007',
      includeDeleted: false,
    }));
  });
});
