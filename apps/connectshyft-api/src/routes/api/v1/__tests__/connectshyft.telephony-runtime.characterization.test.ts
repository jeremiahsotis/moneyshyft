// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { AsyncConnectShyftOperatorCallbackNumberService } from '../../../../modules/connectshyft/operatorCallbackNumbers';
import { AsyncConnectShyftTelephonyReadinessService } from '../../../../modules/connectshyft/telephonyReadiness';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-telephony-runtime';
const TEST_ORG_UNIT_ID = 'org-connectshyft-telephony-runtime-east';
const TEST_USER_ID = 'user-connectshyft-telephony-runtime-operator';
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
  requestedProvider?: string;
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
    : 'corr-connectshyft-telephony-runtime-characterization';
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

  if (options.requestedProvider) {
    headers['x-test-connectshyft-provider-requested'] = options.requestedProvider;
  }

  return headers;
};

describe('connectshyft telephony runtime route characterization', () => {
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

  it('returns the current operator callback-number response shape when present', async () => {
    jest.spyOn(
      AsyncConnectShyftOperatorCallbackNumberService.prototype,
      'getCurrentCallbackNumber',
    ).mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      callbackNumberE164: '+13175550100',
      callbackNumberRawInput: '(317) 555-0100',
      createdAtUtc: '2026-03-22T10:00:00.000Z',
      updatedAtUtc: '2026-03-22T11:00:00.000Z',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/operator/callback-number')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_RESOLVED',
      message: 'ConnectShyft operator callback number resolved',
      data: {
        callbackNumber: {
          value: '+13175550100',
          rawInput: '(317) 555-0100',
          createdAtUtc: '2026-03-22T10:00:00.000Z',
          updatedAtUtc: '2026-03-22T11:00:00.000Z',
        },
      },
    });
  });

  it('returns null callback-number fields when the operator has no saved record', async () => {
    jest.spyOn(
      AsyncConnectShyftOperatorCallbackNumberService.prototype,
      'getCurrentCallbackNumber',
    ).mockResolvedValue(null);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/operator/callback-number')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_RESOLVED',
      data: {
        callbackNumber: {
          value: null,
          rawInput: null,
          createdAtUtc: null,
          updatedAtUtc: null,
        },
      },
    });
  });

  it('returns the telephony readiness response shape for operator callers', async () => {
    jest.spyOn(
      AsyncConnectShyftTelephonyReadinessService.prototype,
      'inspectReadiness',
    ).mockResolvedValue({
      providerReady: true,
      providerSelectionPathActive: true,
      webhookSignatureConfigured: true,
      orgUnitNumberMappingReady: true,
      voiceSupported: true,
      callbackNumberConfigured: true,
      callbackNumberNormalized: true,
      voiceReady: true,
      bridgeCallRunnable: true,
      provider: {
        requestedProvider: 'telnyx',
        resolvedProvider: 'telnyx',
        deterministic: true,
        adapterInterfaceVersion: 'v1',
      },
      orgUnitNumberMappings: {
        activeCount: 1,
        mappings: [
          {
            mappingId: 'mapping-telephony-runtime-1001',
            twilioNumberE164: '+13175550111',
            label: 'Front desk',
          },
        ],
      },
      callbackNumber: {
        value: '+13175550100',
        rawInput: '(317) 555-0100',
        persistenceAvailable: true,
      },
      blockingReasons: [],
      nextActions: [],
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/telephony-readiness')
      .set(buildHeaders({
        requestedProvider: 'telnyx',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_TELEPHONY_READINESS_RESOLVED',
      message: 'ConnectShyft telephony readiness resolved',
      data: {
        voiceReady: true,
        bridgeCallRunnable: true,
        callbackNumberConfigured: true,
        callbackNumberNormalized: true,
        provider: {
          requestedProvider: 'telnyx',
          resolvedProvider: 'telnyx',
          adapterInterfaceVersion: 'v1',
        },
        callbackNumber: {
          value: '+13175550100',
          rawInput: '(317) 555-0100',
          persistenceAvailable: true,
        },
        blockingReasons: [],
        nextActions: [],
      },
    });
  });

  it('returns blocking readiness truth when the operator callback number is missing', async () => {
    jest.spyOn(
      AsyncConnectShyftTelephonyReadinessService.prototype,
      'inspectReadiness',
    ).mockResolvedValue({
      providerReady: true,
      providerSelectionPathActive: true,
      webhookSignatureConfigured: true,
      orgUnitNumberMappingReady: true,
      voiceSupported: true,
      callbackNumberConfigured: false,
      callbackNumberNormalized: false,
      voiceReady: false,
      bridgeCallRunnable: false,
      provider: {
        requestedProvider: 'telnyx',
        resolvedProvider: 'telnyx',
        deterministic: true,
        adapterInterfaceVersion: 'v1',
      },
      orgUnitNumberMappings: {
        activeCount: 1,
        mappings: [
          {
            mappingId: 'mapping-telephony-runtime-1001',
            twilioNumberE164: '+13175550111',
            label: 'Front desk',
          },
        ],
      },
      callbackNumber: {
        value: null,
        rawInput: null,
        persistenceAvailable: true,
      },
      blockingReasons: [
        {
          code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
          category: 'callback_number',
          message: 'Voice forwarding requires an operator callback number.',
          blocking: true,
        },
      ],
      nextActions: [
        {
          code: 'SET_OPERATOR_CALLBACK_NUMBER',
          message: 'Save a callback / forwarding number for the current operator.',
        },
      ],
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/telephony-readiness')
      .set(buildHeaders({
        requestedProvider: 'telnyx',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_TELEPHONY_READINESS_RESOLVED',
      data: {
        voiceReady: false,
        bridgeCallRunnable: false,
        callbackNumberConfigured: false,
        callbackNumberNormalized: false,
        blockingReasons: [
          {
            code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_MISSING',
            category: 'callback_number',
            message: 'Voice forwarding requires an operator callback number.',
            blocking: true,
          },
        ],
        nextActions: [
          {
            code: 'SET_OPERATOR_CALLBACK_NUMBER',
            message: 'Save a callback / forwarding number for the current operator.',
          },
        ],
      },
    });
  });

  it('preserves deterministic invalid callback-number refusal payloads for update requests', async () => {
    jest.spyOn(
      AsyncConnectShyftOperatorCallbackNumberService.prototype,
      'setCallbackNumber',
    ).mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
      message: 'Operator callback number must be a dialable voice number.',
      data: {
        fieldErrors: [
          {
            field: 'callbackNumber',
            reason: 'VOICE_UNSUPPORTED',
            message: 'Operator callback number must be a dialable voice number.',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/operator/callback-number')
      .set(buildHeaders())
      .send({
        callbackNumber: '12345',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_INVALID',
      refusalType: 'business',
      data: {
        fieldErrors: [
          {
            field: 'callbackNumber',
            reason: 'VOICE_UNSUPPORTED',
            message: 'Operator callback number must be a dialable voice number.',
          },
        ],
      },
    });
  });

  it('returns the callback-number save response shape for valid updates', async () => {
    jest.spyOn(
      AsyncConnectShyftOperatorCallbackNumberService.prototype,
      'setCallbackNumber',
    ).mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
      httpStatus: 200,
      data: {
        callbackNumber: {
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          callbackNumberE164: '+13175550100',
          callbackNumberRawInput: '(317) 555-0100',
          createdAtUtc: '2026-03-22T10:00:00.000Z',
          updatedAtUtc: '2026-03-22T11:00:00.000Z',
        },
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/operator/callback-number')
      .set(buildHeaders())
      .send({
        callbackNumber: '(317) 555-0100',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_SAVED',
      message: 'ConnectShyft operator callback number saved',
      data: {
        callbackNumber: {
          value: '+13175550100',
          rawInput: '(317) 555-0100',
          createdAtUtc: '2026-03-22T10:00:00.000Z',
          updatedAtUtc: '2026-03-22T11:00:00.000Z',
        },
      },
    });
  });

  it('refuses telephony runtime access for unauthorized callers', async () => {
    const app = buildApp({
      defaultRole: 'UNAUTHORIZED',
      defaultUserId: 'user-connectshyft-telephony-runtime-unauthorized',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/telephony-readiness')
      .set(buildHeaders({
        role: 'UNAUTHORIZED',
        userId: 'user-connectshyft-telephony-runtime-unauthorized',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_TELEPHONY_READINESS_FORBIDDEN',
      refusalType: 'business',
    });
  });
});
