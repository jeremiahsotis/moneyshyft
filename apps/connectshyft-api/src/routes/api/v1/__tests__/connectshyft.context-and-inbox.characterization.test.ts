// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TelephonyReadinessModule from '../../../../modules/connectshyft/telephonyReadiness';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const CONTEXT_TENANT_ID = 'tenant-connectshyft-alpha';
const CONTEXT_ORG_UNIT_ID = 'org-connectshyft-alpha-east';
const INBOX_TENANT_ID = 'tenant-connectshyft-c3';
const INBOX_ORG_UNIT_ID = 'org-connectshyft-c3-east';
const INBOX_ACTOR_USER_ID = 'user-connectshyft-c3-operator';
const CONNECTSHYFT_TEST_FLAGS = JSON.stringify({
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
});

const buildTelephonyReadiness = (overrides: Record<string, unknown> = {}) => ({
  providerReady: true,
  providerSelectionPathActive: true,
  webhookSignatureConfigured: true,
  orgUnitNumberMappingReady: true,
  voiceSupported: true,
  callbackNumberConfigured: true,
  callbackNumberNormalized: true,
  voiceReady: true,
  bridgeCallRunnable: true,
  smsReady: true,
  messageDispatchRunnable: true,
  provider: {
    requestedProvider: 'telnyx',
    resolvedProvider: 'telnyx',
    deterministic: true,
    adapterInterfaceVersion: 'v1',
  },
  orgUnitNumberMappings: {
    activeCount: 1,
    mappings: [],
  },
  callbackNumber: {
    value: '+12605550155',
    rawInput: '(260) 555-0155',
    createdAtUtc: '2026-03-22T12:00:00.000Z',
    updatedAtUtc: '2026-03-22T12:00:00.000Z',
    persistenceAvailable: true,
  },
  operatorPhoneSource: 'callback_number',
  degradedMode: false,
  blockingReasons: [],
  nextActions: [],
  ...overrides,
});

type HarnessOptions = {
  defaultTenantId?: string;
  defaultOrgUnitId?: string | null;
  defaultRole?: string;
  defaultUserId?: string;
};

type HeaderOptions = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  memberships?: string[];
  correlationId?: string;
  flags?: string;
};

const buildApp = (options: HarnessOptions = {}) => {
  const {
    defaultTenantId = CONTEXT_TENANT_ID,
    defaultOrgUnitId = CONTEXT_ORG_UNIT_ID,
    defaultRole = 'ORGUNIT_MEMBER',
    defaultUserId = 'user-connectshyft-alpha-member',
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
      activeOrgUnitId: orgUnitId,
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
    : CONTEXT_TENANT_ID;
  const orgUnitId = Object.prototype.hasOwnProperty.call(options, 'orgUnitId')
    ? options.orgUnitId
    : CONTEXT_ORG_UNIT_ID;
  const role = Object.prototype.hasOwnProperty.call(options, 'role')
    ? options.role
    : 'ORGUNIT_MEMBER';
  const userId = Object.prototype.hasOwnProperty.call(options, 'userId')
    ? options.userId
    : 'user-connectshyft-alpha-member';
  const memberships = Object.prototype.hasOwnProperty.call(options, 'memberships')
    ? options.memberships
    : (orgUnitId ? [orgUnitId] : undefined);
  const correlationId = Object.prototype.hasOwnProperty.call(options, 'correlationId')
    ? options.correlationId
    : 'corr-connectshyft-context-inbox-characterization';
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

describe('connectshyft context and inbox route characterization', () => {
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
    jest.spyOn(
      TelephonyReadinessModule.connectShyftTelephonyReadinessServiceAsync,
      'inspectReadiness',
    ).mockResolvedValue(buildTelephonyReadiness());
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

  it('returns resolved member-scoped tenant and orgUnit context', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/context')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
      data: {
        context: {
          tenantId: CONTEXT_TENANT_ID,
          orgUnitId: CONTEXT_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
          orgUnits: expect.arrayContaining([
            expect.objectContaining({
              id: CONTEXT_ORG_UNIT_ID,
              availableModules: {
                people: true,
                connect: true,
                settings: true,
              },
            }),
          ]),
          telephony: {
            operatorPhoneSource: 'callback_number',
            voiceReady: true,
            smsReady: true,
            degradedMode: false,
          },
        },
      },
    });
  });

  it('preserves tenant-privileged orgUnit bypass semantics in the resolved context payload', async () => {
    (
      TelephonyReadinessModule.connectShyftTelephonyReadinessServiceAsync
        .inspectReadiness as jest.Mock
    ).mockResolvedValueOnce(buildTelephonyReadiness({
      operatorPhoneSource: 'orgunit_default',
      degradedMode: true,
    }));

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/context')
      .set(buildHeaders(
        {
          orgUnitId: 'org-connectshyft-alpha-west',
          role: 'TENANT_ADMIN',
          memberships: undefined,
        },
      ));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
      data: {
        context: {
          tenantId: CONTEXT_TENANT_ID,
          orgUnitId: 'org-connectshyft-alpha-west',
          bypassedOrgUnitMembership: true,
          orgUnits: expect.arrayContaining([
            expect.objectContaining({
              id: 'org-connectshyft-alpha-west',
              availableModules: {
                people: true,
                connect: true,
                settings: true,
              },
            }),
          ]),
          telephony: {
            operatorPhoneSource: 'orgunit_default',
            voiceReady: true,
            smsReady: true,
            degradedMode: true,
          },
        },
      },
    });
  });

  it('returns the current missing-orgUnit refusal for orgUnit-scoped context requests', async () => {
    const app = buildApp({
      defaultOrgUnitId: null,
      defaultUserId: 'user-connectshyft-alpha-no-org',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/context')
      .set(buildHeaders(
        {
          orgUnitId: undefined,
          userId: 'user-connectshyft-alpha-no-org',
          memberships: undefined,
        },
        {
          'x-test-connectshyft-orgunit-id': undefined,
        },
      ));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      refusalType: 'business',
    });
  });

  it('returns the current invalid-orgUnit refusal when the route receives an invalid orgUnit identifier', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/context')
      .set(buildHeaders(
        {
          orgUnitId: 'invalid-orgunit-context',
          memberships: ['invalid-orgunit-context'],
        },
      ));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      refusalType: 'business',
    });
  });

  it('returns the seeded orgUnit inbox bucket and excludes the current actors claimed thread from the shared queue', async () => {
    const app = buildApp({
      defaultTenantId: INBOX_TENANT_ID,
      defaultOrgUnitId: INBOX_ORG_UNIT_ID,
      defaultUserId: INBOX_ACTOR_USER_ID,
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .set(buildHeaders({
        tenantId: INBOX_TENANT_ID,
        orgUnitId: INBOX_ORG_UNIT_ID,
        userId: INBOX_ACTOR_USER_ID,
        memberships: [INBOX_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_INBOX_READY',
      data: {
        bucket: 'inbox',
        context: {
          tenantId: INBOX_TENANT_ID,
          orgUnitId: INBOX_ORG_UNIT_ID,
          bypassedOrgUnitMembership: false,
        },
        actions: {
          claim: true,
          takeover: true,
        },
        latencyBudgetsMs: {
          p95: 750,
          p99: 1500,
        },
      },
    });
    expect(response.body.data.items.map((item) => item.threadId)).toEqual([
      '2686f12a-b7dc-4ab2-8de2-70b05684198b',
      '90ca1c73-be82-48c6-8ba0-504e872ad211',
      '05a64891-ba69-4385-8bb9-140f01e0d243',
      '47e2e20d-f3bc-4c0d-87a6-d3f0b0cbe69e',
      '212a5375-c931-48fb-84c0-0eb4f1e3282b',
    ]);
    expect(response.body.data.items.map((item) => item.threadId)).not.toContain(
      '7ce62a91-60dd-4869-8816-d782f26b85d1',
    );
  });

  it('returns only the current actors claimed conversations for the mine bucket', async () => {
    const app = buildApp({
      defaultTenantId: INBOX_TENANT_ID,
      defaultOrgUnitId: INBOX_ORG_UNIT_ID,
      defaultUserId: INBOX_ACTOR_USER_ID,
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .query({
        bucket: 'mine',
      })
      .set(buildHeaders({
        tenantId: INBOX_TENANT_ID,
        orgUnitId: INBOX_ORG_UNIT_ID,
        userId: INBOX_ACTOR_USER_ID,
        memberships: [INBOX_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_MINE_LISTED',
      data: {
        bucket: 'mine',
        items: [
          expect.objectContaining({
            threadId: '7ce62a91-60dd-4869-8816-d782f26b85d1',
            bucket: 'mine',
            state: 'CLAIMED',
            claimedByUserId: INBOX_ACTOR_USER_ID,
          }),
        ],
      },
    });
    expect(response.body.data.items).toHaveLength(1);
  });

  it('requires an actor context for mine bucket reads', async () => {
    const app = buildApp({
      defaultTenantId: INBOX_TENANT_ID,
      defaultOrgUnitId: INBOX_ORG_UNIT_ID,
      defaultUserId: INBOX_ACTOR_USER_ID,
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .query({
        bucket: 'mine',
      })
      .set(buildHeaders(
        {
          tenantId: INBOX_TENANT_ID,
          orgUnitId: INBOX_ORG_UNIT_ID,
          userId: '   ',
          memberships: [INBOX_ORG_UNIT_ID],
        },
      ));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      refusalType: 'business',
      data: {
        bucket: 'mine',
      },
    });
  });

  it('preserves thread-view access enforcement for inbox reads', async () => {
    const app = buildApp({
      defaultTenantId: INBOX_TENANT_ID,
      defaultOrgUnitId: INBOX_ORG_UNIT_ID,
      defaultRole: 'UNAUTHORIZED',
      defaultUserId: INBOX_ACTOR_USER_ID,
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/inbox')
      .set(buildHeaders({
        tenantId: INBOX_TENANT_ID,
        orgUnitId: INBOX_ORG_UNIT_ID,
        role: 'UNAUTHORIZED',
        userId: INBOX_ACTOR_USER_ID,
        memberships: [INBOX_ORG_UNIT_ID],
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
      refusalType: 'business',
    });
  });
});
