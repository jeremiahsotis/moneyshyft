// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import { connectShyftNeighborServiceAsync } from '../../../../modules/connectshyft/neighbors';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ORG_UNIT_ID = '22222222-2222-4222-8222-222222222222';
const TEST_USER_ID = '33333333-3333-4333-8333-333333333333';
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
  overrides: Record<string, string | undefined> = {},
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
    : 'corr-connectshyft-neighbor-create-characterization';
  const flags = Object.prototype.hasOwnProperty.call(options, 'flags')
    ? options.flags
    : CONNECTSHYFT_TEST_FLAGS;

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

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'undefined') {
      delete headers[key];
      continue;
    }

    headers[key] = value;
  }

  return headers;
};

const buildNeighbor = (overrides: Record<string, unknown> = {}) => ({
  neighborId: '44444444-4444-4444-8444-444444444444',
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
      phoneId: '55555555-5555-4555-8555-555555555555',
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

describe('connectshyft neighbor create route characterization', () => {
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

  it('returns the current create success envelope and neighbor scope payload', async () => {
    const createSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: buildNeighbor(),
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

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      message: 'Neighbor created',
      data: {
        neighborId: '44444444-4444-4444-8444-444444444444',
        neighbor: {
          neighborId: '44444444-4444-4444-8444-444444444444',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          phones: [
            expect.objectContaining({
              value: '+12605550199',
            }),
          ],
        },
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'neighbor',
      'neighborId',
      'scope',
    ].sort());
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      firstName: 'Mina',
      lastName: 'Lopez',
      prefersTexting: 'YES',
    }));
  });

  it('returns the current phone-validation refusal envelope for create requests', async () => {
    jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      message: 'Provide a valid phone number (for example, 2605550199).',
      data: {
        fieldErrors: [
          {
            field: 'phones',
            reason: 'INVALID_FORMAT',
            message: 'Provide a valid phone number (for example, 2605550199).',
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
        firstName: 'Ari',
        lastName: 'Quinn',
        phones: [
          {
            label: 'mobile',
            value: '260-ABC-0199',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
      message: 'Provide a valid phone number (for example, 2605550199).',
      refusalType: 'business',
      data: {
        fieldErrors: [
          {
            field: 'phones',
            reason: 'INVALID_FORMAT',
            message: 'Provide a valid phone number (for example, 2605550199).',
          },
        ],
        scope: {
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
        },
      },
    });
  });

  it('returns the current duplicate-phone refusal envelope for create requests', async () => {
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

  it('returns the current capability refusal when the caller lacks create access', async () => {
    const createSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor');

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders({
        role: 'TENANT_VIEWER',
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Ari',
        lastName: 'Quinn',
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
      code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
      message: 'Neighbor creation requires an authorized ConnectShyft role.',
      refusalType: 'business',
    });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('returns the current missing-orgUnit refusal before create logic runs', async () => {
    const createSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor');

    const app = buildApp({
      defaultTenantId: 'tenant-connectshyft-alpha',
      defaultOrgUnitId: null,
      defaultUserId: 'user-connectshyft-alpha-member',
    });
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders({
        tenantId: 'tenant-connectshyft-alpha',
        orgUnitId: undefined,
        userId: 'user-connectshyft-alpha-member',
        memberships: undefined,
      }))
      .send({
        firstName: 'No',
        lastName: 'Context',
        phones: [
          {
            label: 'mobile',
            value: '+12605550100',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      message: 'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
      refusalType: 'business',
    });
    expect(createSpy).not.toHaveBeenCalled();
  });
});
