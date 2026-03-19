// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TenantModuleEntitlements from '../../../../platform/tenantModuleEntitlements';
import { connectShyftNeighborServiceAsync } from '../../../../modules/connectshyft/neighbors';
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
});
