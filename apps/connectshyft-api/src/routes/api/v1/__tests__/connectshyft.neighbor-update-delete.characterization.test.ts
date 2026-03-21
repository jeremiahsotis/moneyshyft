// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import * as executePlatformMutationModule from '../../../../platform/mutations/executePlatformMutation';
import {
  AsyncConnectShyftNeighborService,
  connectShyftNeighborServiceAsync,
} from '../../../../modules/connectshyft/neighbors';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';
const TEST_USER_ID = '33333333-3333-4333-8333-333333333333';
const UPDATE_NEIGHBOR_ID = '44444444-4444-4444-8444-444444444444';
const DELETE_NEIGHBOR_ID = '55555555-5555-4555-8555-555555555555';
const CONNECTSHYFT_TEST_FLAGS = JSON.stringify({
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
});

type HarnessOptions = {
  defaultTenantId?: string;
  defaultOrgUnitId?: string | null;
  defaultRole?: string;
  defaultUserId?: string;
};

type HeaderOptions = {
  tenantId?: string;
  orgUnitId?: string | undefined;
  role?: string;
  userId?: string;
  memberships?: string[] | undefined;
  correlationId?: string;
  flags?: string;
  activeThreadNeighborIds?: string[] | undefined;
};

const buildApp = (options: HarnessOptions = {}) => {
  const {
    defaultTenantId = TEST_TENANT_ID,
    defaultOrgUnitId = TEST_ORG_UNIT_ID,
    defaultRole = 'ORGUNIT_MEMBER',
    defaultUserId = TEST_USER_ID,
  } = options;

  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || defaultTenantId;
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || defaultOrgUnitId;
    const role = req.header('x-test-connectshyft-role') || defaultRole;
    const userId = req.header('x-test-connectshyft-user-id') || defaultUserId;

    req.user = {
      userId,
      email: `${String(userId).trim() || 'anonymous'}@connectshyft.test`,
      householdId: tenantId,
      activeTenantId: tenantId,
      activeOrgUnitId: orgUnitId ?? undefined,
      role,
    };
    req.tenantId = tenantId;
    req.orgUnitId = orgUnitId ?? undefined;
    req.tenantContext = tenantId
      ? {
        tenantId,
        orgUnitId: orgUnitId ?? undefined,
        scopeMode: orgUnitId ? 'ORG_UNIT' : 'TENANT',
        source: 'auth',
      }
      : undefined;

    next();
  });

  app.use('/api/v1/connectshyft', connectShyftRouter);
  return app;
};

const buildHeaders = (
  options: HeaderOptions = {},
): Record<string, string> => {
  const tenantId = Object.prototype.hasOwnProperty.call(options, 'tenantId')
    ? options.tenantId
    : TEST_TENANT_ID;
  const orgUnitId = Object.prototype.hasOwnProperty.call(options, 'orgUnitId')
    ? options.orgUnitId
    : TEST_ORG_UNIT_ID;
  const role = Object.prototype.hasOwnProperty.call(options, 'role')
    ? options.role
    : 'ORGUNIT_MEMBER';
  const userId = Object.prototype.hasOwnProperty.call(options, 'userId')
    ? options.userId
    : TEST_USER_ID;
  const memberships = Object.prototype.hasOwnProperty.call(options, 'memberships')
    ? options.memberships
    : (orgUnitId ? [orgUnitId] : undefined);
  const correlationId = Object.prototype.hasOwnProperty.call(options, 'correlationId')
    ? options.correlationId
    : 'corr-connectshyft-neighbor-update-delete-characterization';
  const flags = Object.prototype.hasOwnProperty.call(options, 'flags')
    ? options.flags
    : CONNECTSHYFT_TEST_FLAGS;
  const activeThreadNeighborIds = Object.prototype.hasOwnProperty.call(options, 'activeThreadNeighborIds')
    ? options.activeThreadNeighborIds
    : undefined;

  const headers: Record<string, string> = {
    'x-correlation-id': correlationId,
    'x-test-connectshyft-flags': flags,
    'x-test-connectshyft-tenant-id': tenantId,
    'x-test-connectshyft-role': role,
    'x-test-connectshyft-user-id': userId,
  };

  if (orgUnitId) {
    headers['x-test-connectshyft-orgunit-id'] = orgUnitId;
  }

  if (memberships) {
    headers['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(memberships);
  }

  if (activeThreadNeighborIds) {
    headers['x-test-connectshyft-active-thread-neighbor-ids'] = JSON.stringify(activeThreadNeighborIds);
  }

  return headers;
};

const buildNeighbor = (overrides: Record<string, unknown> = {}) => ({
  neighborId: UPDATE_NEIGHBOR_ID,
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  firstName: 'Mina',
  lastName: 'Lopez',
  prefersTexting: 'YES',
  isDeleted: false,
  deletedAtUtc: null,
  deletedByUserId: null,
  phones: [
    {
      phoneId: '66666666-6666-4666-8666-666666666666',
      label: 'mobile',
      value: '+12605550199',
      rawInput: '+1 (260) 555-0199',
      displayNational: '(260) 555-0199',
      countryCode: '1',
      nationalNumber: '2605550199',
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
  ...overrides,
});

describe('connectshyft neighbor update and delete route characterization', () => {
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

  it('returns the current update success envelope for relationship-gated edits', async () => {
    const updateSpy = jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'updateNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      httpStatus: 200,
      data: {
        neighbor: buildNeighbor({
          lastName: 'Updated',
        }),
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .put(`/api/v1/connectshyft/neighbors/${UPDATE_NEIGHBOR_ID}`)
      .set(buildHeaders({
        activeThreadNeighborIds: [UPDATE_NEIGHBOR_ID],
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Updated',
        prefersTexting: 'YES',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
            verificationStatus: 'verified',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      message: 'Neighbor profile updated',
      data: {
        neighbor: {
          neighborId: UPDATE_NEIGHBOR_ID,
          lastName: 'Updated',
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
        editPolicy: {
          path: 'relationship-gated',
          indicator: 'Active thread relationship',
        },
        contextOverrideNotice: null,
        audit: {
          eventName: 'connectshyft.neighbor.updated',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            policy_path: 'relationship-gated',
            mutation_context: {
              policy_path: 'relationship-gated',
              neighbor_id: UPDATE_NEIGHBOR_ID,
            },
          },
        },
        outbox: {
          eventName: 'connectshyft.neighbor.updated',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            policy_path: 'relationship-gated',
          },
        },
        sideEffectsPersisted: true,
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'audit',
      'contextOverrideNotice',
      'editPolicy',
      'neighbor',
      'outbox',
      'scope',
      'sideEffectsPersisted',
    ].sort());
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: UPDATE_NEIGHBOR_ID,
      relationshipValidated: true,
    }));
  });

  it('returns the current relationship-gate refusal when edit access is not established', async () => {
    const updateSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'updateNeighbor');

    const app = buildApp();
    const response = await request(app)
      .put(`/api/v1/connectshyft/neighbors/${UPDATE_NEIGHBOR_ID}`)
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Blocked',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_EDIT_RELATIONSHIP_REQUIRED',
      message: 'This edit requires an active thread relationship or tenant-privileged role.',
      refusalType: 'business',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('returns the current duplicate-phone refusal envelope for update requests', async () => {
    jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'updateNeighbor').mockResolvedValue({
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
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .put(`/api/v1/connectshyft/neighbors/${UPDATE_NEIGHBOR_ID}`)
      .set(buildHeaders({
        activeThreadNeighborIds: [UPDATE_NEIGHBOR_ID],
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
      message: 'That phone number is already assigned to another current neighbor.',
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

  it('returns the current delete success envelope and persisted side-effect markers', async () => {
    const deletedNeighbor = buildNeighbor({
      neighborId: DELETE_NEIGHBOR_ID,
      isDeleted: true,
      deletedAtUtc: '2026-03-18T12:10:00.000Z',
      deletedByUserId: TEST_USER_ID,
      phones: [
        {
          phoneId: '77777777-7777-4777-8777-777777777777',
          label: 'mobile',
          value: '+12605550199',
          rawInput: '+1 (260) 555-0199',
          displayNational: '(260) 555-0199',
          countryCode: '1',
          nationalNumber: '2605550199',
          extension: null,
          validationStatus: 'valid',
          usageType: 'personal',
          source: 'user_entered',
          sortOrder: 0,
          isPrimary: true,
          isShared: false,
          verificationStatus: 'verified',
          isActive: false,
          createdAtUtc: '2026-03-18T12:00:00.000Z',
          updatedAtUtc: '2026-03-18T12:10:00.000Z',
        },
      ],
    });
    const softDeleteSpy = jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'softDeleteNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      httpStatus: 200,
      data: {
        alreadyDeleted: false,
        neighbor: deletedNeighbor,
      },
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .delete(`/api/v1/connectshyft/neighbors/${DELETE_NEIGHBOR_ID}`)
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_SOFT_DELETED',
      message: 'Neighbor soft-deleted',
      data: {
        neighborId: DELETE_NEIGHBOR_ID,
        alreadyDeleted: false,
        neighbor: {
          neighborId: DELETE_NEIGHBOR_ID,
          isDeleted: true,
          deletedAtUtc: '2026-03-18T12:10:00.000Z',
          deletedByUserId: TEST_USER_ID,
          phones: [
            expect.objectContaining({
              isActive: false,
            }),
          ],
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
        audit: {
          eventName: 'connectshyft.neighbor.soft_deleted',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            neighbor_id: DELETE_NEIGHBOR_ID,
            deleted_at_utc: '2026-03-18T12:10:00.000Z',
          },
        },
        outbox: {
          eventName: 'connectshyft.neighbor.soft_deleted',
          metadata: {
            tenant_id: TEST_TENANT_ID,
            org_unit_id: TEST_ORG_UNIT_ID,
            actor_user_id: TEST_USER_ID,
            neighbor_id: DELETE_NEIGHBOR_ID,
            deleted_at_utc: '2026-03-18T12:10:00.000Z',
          },
        },
        sideEffectsPersisted: true,
      },
    });
    expect(softDeleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: DELETE_NEIGHBOR_ID,
      actorUserId: TEST_USER_ID,
      irreversibleConfirmation: true,
    }));
  });

  it('returns the current tenant-privileged refusal for non-admin delete callers', async () => {
    const softDeleteSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'softDeleteNeighbor');

    const app = buildApp();
    const response = await request(app)
      .delete(`/api/v1/connectshyft/neighbors/${DELETE_NEIGHBOR_ID}`)
      .set(buildHeaders({
        role: 'ORGUNIT_MEMBER',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_FORBIDDEN',
      message: 'Neighbor soft delete requires a tenant-privileged ConnectShyft admin role.',
      refusalType: 'business',
    });
    expect(softDeleteSpy).not.toHaveBeenCalled();
  });

  it('returns the current delete-confirmation refusal envelope', async () => {
    jest.spyOn(AsyncConnectShyftNeighborService.prototype, 'softDeleteNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED',
      message: 'Neighbor soft delete requires explicit irreversible confirmation.',
    } as any);
    jest.spyOn(executePlatformMutationModule, 'executePlatformMutation').mockImplementation(
      async (input: { mutation: (trx: unknown) => Promise<unknown> }) => input.mutation({}),
    );

    const app = buildApp();
    const response = await request(app)
      .delete(`/api/v1/connectshyft/neighbors/${DELETE_NEIGHBOR_ID}`)
      .set(buildHeaders({
        role: 'TENANT_ADMIN',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        irreversibleConfirmation: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_DELETE_CONFIRMATION_REQUIRED',
      message: 'Neighbor soft delete requires explicit irreversible confirmation.',
      refusalType: 'business',
      data: {
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });
});
