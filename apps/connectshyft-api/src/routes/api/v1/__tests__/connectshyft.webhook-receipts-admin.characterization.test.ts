// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as ProviderCorrelationMappings from '../../../../modules/connectshyft/providerCorrelationMappings';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-s11-webhook-admin';
const TEST_ORG_UNIT_ID = 'org-connectshyft-s11-webhook-admin-east';
const TEST_USER_ID = 'user-connectshyft-s11-webhook-admin';
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
    defaultRole = 'ORGUNIT_ADMIN',
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
    : 'ORGUNIT_ADMIN';
  const userId = Object.prototype.hasOwnProperty.call(options, 'userId')
    ? options.userId
    : TEST_USER_ID;
  const memberships = Object.prototype.hasOwnProperty.call(options, 'memberships')
    ? options.memberships
    : (orgUnitId ? [orgUnitId] : undefined);
  const correlationId = Object.prototype.hasOwnProperty.call(options, 'correlationId')
    ? options.correlationId
    : 'corr-connectshyft-webhook-admin-characterization';
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

  return headers;
};

describe('connectshyft webhook receipt admin route characterization', () => {
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

  it('returns the current webhook receipt metrics success envelope and retention window payload fields', async () => {
    const metricsSpy = jest.spyOn(
      ProviderCorrelationMappings,
      'loadConnectShyftWebhookReceiptMetrics',
    ).mockResolvedValue({
      deterministic: true,
      retentionWindowDays: 45,
      totalRows: 12,
      oldestRetainedAt: '2026-01-10T00:00:00.000Z',
      expiredRowsCandidate: 3,
      asOfUtc: '2026-03-20T15:00:00.000Z',
      cutoffUtc: '2026-02-04T15:00:00.000Z',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/admin/webhook-receipts/metrics')
      .query({
        orgUnitId: TEST_ORG_UNIT_ID,
        retentionWindowDays: '45',
        asOfUtc: '2026-03-20T15:00:00.000Z',
      })
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_METRICS_LOADED',
      message: 'Webhook receipt metrics loaded',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        retentionWindowDays: 45,
        totalRows: 12,
        expiredRowsCandidate: 3,
        oldestRetainedAt: '2026-01-10T00:00:00.000Z',
        asOfUtc: '2026-03-20T15:00:00.000Z',
        cutoffUtc: '2026-02-04T15:00:00.000Z',
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'asOfUtc',
      'cutoffUtc',
      'expiredRowsCandidate',
      'oldestRetainedAt',
      'orgUnitId',
      'retentionWindowDays',
      'totalRows',
    ].sort());
    expect(metricsSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      retentionWindowDays: 45,
      asOfUtc: '2026-03-20T15:00:00.000Z',
      db: expect.anything(),
    }));
  });

  it('maps temporary-unavailable metrics failures to the current refusal envelope', async () => {
    jest.spyOn(
      ProviderCorrelationMappings,
      'loadConnectShyftWebhookReceiptMetrics',
    ).mockResolvedValue({
      deterministic: true,
      retentionWindowDays: 30,
      totalRows: 0,
      oldestRetainedAt: '2026-03-20T15:00:00.000Z',
      expiredRowsCandidate: 0,
      asOfUtc: '2026-03-20T15:00:00.000Z',
      cutoffUtc: '2026-02-18T15:00:00.000Z',
      error: {
        code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
        message: 'Webhook receipt persistence unavailable.',
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/admin/webhook-receipts/metrics')
      .query({
        orgUnitId: TEST_ORG_UNIT_ID,
      })
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
      message: 'Webhook receipt metrics are temporarily unavailable.',
      refusalType: 'business',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
      },
    });
  });

  it('returns the current cleanup dry-run success envelope and payload shape', async () => {
    const cleanupSpy = jest.spyOn(
      ProviderCorrelationMappings,
      'cleanupConnectShyftWebhookReceipts',
    ).mockResolvedValue({
      deterministic: true,
      policyWindowDays: 30,
      dryRun: true,
      expiredRowsRemoved: 4,
      activeWindowProtected: true,
      totalRowsBefore: 11,
      totalRowsAfter: 11,
      oldestRetainedAt: '2026-02-01T00:00:00.000Z',
      executedAtUtc: '2026-03-20T16:00:00.000Z',
      cutoffUtc: '2026-02-18T16:00:00.000Z',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/admin/webhook-receipts/cleanup')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        policyWindowDays: '30',
        dryRun: 'true',
        asOfUtc: '2026-03-20T16:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_APPLIED',
      message: 'Webhook receipt retention cleanup dry-run complete',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        policyWindowDays: 30,
        dryRun: true,
        expiredRowsRemoved: 4,
        activeWindowProtected: true,
        totalRowsBefore: 11,
        totalRowsAfter: 11,
        oldestRetainedAt: '2026-02-01T00:00:00.000Z',
        executedAtUtc: '2026-03-20T16:00:00.000Z',
        cutoffUtc: '2026-02-18T16:00:00.000Z',
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'activeWindowProtected',
      'cutoffUtc',
      'dryRun',
      'executedAtUtc',
      'expiredRowsRemoved',
      'oldestRetainedAt',
      'orgUnitId',
      'policyWindowDays',
      'totalRowsAfter',
      'totalRowsBefore',
    ].sort());
    expect(cleanupSpy).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      policyWindowDays: 30,
      dryRun: true,
      asOfUtc: '2026-03-20T16:00:00.000Z',
      db: expect.anything(),
    }));
  });

  it('maps temporary-unavailable cleanup failures to the current refusal envelope', async () => {
    jest.spyOn(
      ProviderCorrelationMappings,
      'cleanupConnectShyftWebhookReceipts',
    ).mockResolvedValue({
      deterministic: true,
      policyWindowDays: 7,
      dryRun: false,
      expiredRowsRemoved: 0,
      activeWindowProtected: true,
      totalRowsBefore: 0,
      totalRowsAfter: 0,
      oldestRetainedAt: '2026-03-20T16:00:00.000Z',
      executedAtUtc: '2026-03-20T16:00:00.000Z',
      cutoffUtc: '2026-03-13T16:00:00.000Z',
      error: {
        code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
        message: 'Webhook receipt persistence unavailable.',
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/admin/webhook-receipts/cleanup')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        policyWindowDays: '7',
        dryRun: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_RECEIPT_PERSISTENCE_UNAVAILABLE',
      message: 'Webhook receipt cleanup is temporarily unavailable.',
      refusalType: 'business',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        policyWindowDays: 7,
      },
    });
  });
});
