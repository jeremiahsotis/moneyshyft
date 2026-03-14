import express from 'express';
import request from 'supertest';
import * as PlatformAdminService from '../../../../services/PlatformAdminService';
import { connectShyftNeighborServiceAsync } from '../../../../modules/connectshyft/neighbors';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-alpha';
const TEST_ORG_UNIT_ID = 'org-connectshyft-alpha-east';

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

describe('connectshyft neighbor routes', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
  });

  beforeEach(() => {
    jest.spyOn(PlatformAdminService, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
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
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = previousOverrideFlag;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });

  it('passes explicit create-time prefersTexting values through and returns the canonical enum', async () => {
    const createSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: {
          neighborId: 'neighbor-create-yes',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Mina',
          lastName: 'Lopez',
          prefersTexting: 'NO',
          phones: [],
          createdAtUtc: '2026-03-14T00:00:00.000Z',
          updatedAtUtc: '2026-03-14T00:00:00.000Z',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Lopez',
        prefersTexting: 'NO',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      prefersTexting: 'NO',
    }));
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      data: {
        neighbor: {
          neighborId: 'neighbor-create-yes',
          prefersTexting: 'NO',
        },
      },
    });
  });

  it('treats invalid create-time prefersTexting values as omitted', async () => {
    const createSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'createNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
      httpStatus: 201,
      data: {
        neighbor: {
          neighborId: 'neighbor-create-default',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Ari',
          lastName: 'Quinn',
          prefersTexting: 'YES',
          phones: [],
          createdAtUtc: '2026-03-14T00:00:00.000Z',
          updatedAtUtc: '2026-03-14T00:00:00.000Z',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/neighbors')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Ari',
        lastName: 'Quinn',
        prefersTexting: 'MAYBE',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      prefersTexting: undefined,
    }));
    expect(response.body).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'YES',
        },
      },
    });
  });

  it('passes update-time prefers_texting alias values through and returns the canonical enum', async () => {
    const updateSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'updateNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      httpStatus: 200,
      data: {
        neighbor: {
          neighborId: 'neighbor-update-unknown',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Jules',
          lastName: 'North',
          prefersTexting: 'UNKNOWN',
          phones: [],
          createdAtUtc: '2026-03-14T00:00:00.000Z',
          updatedAtUtc: '2026-03-14T00:00:00.000Z',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/neighbors/neighbor-update-unknown')
      .set(buildHeaders({ 'x-test-connectshyft-role': 'TENANT_ADMIN' }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Jules',
        lastName: 'North',
        prefers_texting: 'UNKNOWN',
        phones: [
          {
            label: 'mobile',
            value: '+12605550200',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      neighborId: 'neighbor-update-unknown',
      prefersTexting: 'UNKNOWN',
    }));
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      data: {
        neighbor: {
          prefersTexting: 'UNKNOWN',
        },
      },
    });
  });

  it('treats invalid update-time prefersTexting values as omitted so existing values can be preserved', async () => {
    const updateSpy = jest.spyOn(connectShyftNeighborServiceAsync, 'updateNeighbor').mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
      httpStatus: 200,
      data: {
        neighbor: {
          neighborId: 'neighbor-update-preserve',
          tenantId: TEST_TENANT_ID,
          orgUnitId: TEST_ORG_UNIT_ID,
          firstName: 'Mina',
          lastName: 'Shared',
          prefersTexting: 'YES',
          phones: [],
          createdAtUtc: '2026-03-14T00:00:00.000Z',
          updatedAtUtc: '2026-03-14T00:00:00.000Z',
        },
      },
    });

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/neighbors/neighbor-update-preserve')
      .set(buildHeaders({ 'x-test-connectshyft-role': 'TENANT_ADMIN' }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        firstName: 'Mina',
        lastName: 'Shared',
        prefersTexting: 'INVALID',
        phones: [
          {
            label: 'mobile',
            value: '+12605550199',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      prefersTexting: undefined,
    }));
    expect(response.body).toMatchObject({
      ok: true,
      data: {
        neighbor: {
          prefersTexting: 'YES',
        },
      },
    });
  });
});
