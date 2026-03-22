// @ts-nocheck
import express from 'express';
import request from 'supertest';
import * as TelephonyReadinessModule from '../../../../modules/connectshyft/telephonyReadiness';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-alpha';
const TEST_ORG_UNIT_ID = 'org-connectshyft-alpha-east';
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
  smsReady: false,
  messageDispatchRunnable: false,
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
  operatorPhoneSource: 'orgunit_default',
  degradedMode: true,
  blockingReasons: [
    {
      code: 'CONNECTSHYFT_ORGUNIT_DEFAULT_OPERATOR_PHONE_ACTIVE',
      category: 'orgunit_fallback',
      message: 'Using the orgUnit fallback phone until the operator callback number is set.',
      blocking: false,
      channel: 'both',
    },
  ],
  nextActions: [
    {
      code: 'SET_OPERATOR_CALLBACK_NUMBER',
      message: 'Save a callback / forwarding number so telephony no longer depends on the orgUnit fallback phone.',
    },
  ],
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
    defaultTenantId = TEST_TENANT_ID,
    defaultOrgUnitId = TEST_ORG_UNIT_ID,
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
    : TEST_TENANT_ID;
  const orgUnitId = Object.prototype.hasOwnProperty.call(options, 'orgUnitId')
    ? options.orgUnitId
    : TEST_ORG_UNIT_ID;
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
    : 'corr-connectshyft-settings-availability-characterization';
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

describe('connectshyft settings and availability route characterization', () => {
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

  it('returns primary-only settings navigation for orgUnit members', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/settings/navigation')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
      data: {
        adminOptions: [],
      },
    });
    expect(response.body.data.primaryOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'directory',
        path: '/app/connectshyft/directory',
      }),
      expect.objectContaining({
        key: 'settings',
        path: '/app/connectshyft/settings',
      }),
      expect.objectContaining({
        key: 'sign-out',
        path: '/login',
      }),
    ]));
    expect(response.body.data.pathways).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: '/app/connectshyft/directory',
        allowed: true,
      }),
      expect.objectContaining({
        path: '/app/connectshyft/settings/availability',
        allowed: false,
      }),
    ]));
  });

  it('returns admin navigation pathways for admin-capable settings callers', async () => {
    const app = buildApp({
      defaultRole: 'ORGUNIT_ADMIN',
      defaultUserId: 'user-connectshyft-alpha-admin',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/settings/navigation')
      .set(buildHeaders({
        role: 'ORGUNIT_ADMIN',
        userId: 'user-connectshyft-alpha-admin',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_RESOLVED',
    });
    expect(response.body.data.adminOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'availability',
        path: '/app/connectshyft/settings/availability',
      }),
      expect.objectContaining({
        key: 'number-mappings',
        path: '/app/connectshyft/settings/numbers',
      }),
      expect.objectContaining({
        key: 'escalation-configuration',
        path: '/app/connectshyft/settings/escalation',
      }),
    ]));
    expect(response.body.data.pathways).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: '/app/connectshyft/settings/availability',
        allowed: true,
      }),
      expect.objectContaining({
        path: '/app/connectshyft/settings/numbers',
        allowed: true,
      }),
      expect.objectContaining({
        path: '/app/connectshyft/settings/escalation',
        allowed: true,
      }),
    ]));
  });

  it('keeps callback setup anchored to the shared settings entry point without extra navigation routes', async () => {
    const app = buildApp({
      defaultRole: 'ORGUNIT_ADMIN',
      defaultUserId: 'user-connectshyft-alpha-admin',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/settings/navigation')
      .set(buildHeaders({
        role: 'ORGUNIT_ADMIN',
        userId: 'user-connectshyft-alpha-admin',
      }));

    expect(response.status).toBe(200);
    const optionPaths = [
      ...response.body.data.primaryOptions.map((option: { path: string }) => option.path),
      ...response.body.data.adminOptions.map((option: { path: string }) => option.path),
      ...response.body.data.pathways.map((pathway: { path: string }) => pathway.path),
    ];

    expect(optionPaths.some((path) =>
      /callback|forwarding|readiness|telephony/i.test(path))).toBe(false);
  });

  it('preserves the current settings navigation access refusal payload', async () => {
    const app = buildApp({
      defaultRole: 'UNAUTHORIZED',
      defaultUserId: 'user-connectshyft-alpha-unauthorized',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/settings/navigation')
      .set(buildHeaders({
        role: 'UNAUTHORIZED',
        userId: 'user-connectshyft-alpha-unauthorized',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SETTINGS_NAVIGATION_FORBIDDEN',
      refusalType: 'business',
      data: {
        adminOptions: [],
      },
    });
    expect(response.body.data.primaryOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'directory',
      }),
      expect.objectContaining({
        key: 'settings',
      }),
    ]));
    expect(response.body.data.pathways).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: '/app/connectshyft/settings/availability',
        allowed: false,
      }),
    ]));
  });

  it('returns the availability payload shape for admin-capable callers', async () => {
    const app = buildApp({
      defaultRole: 'ORGUNIT_ADMIN',
      defaultUserId: 'user-connectshyft-alpha-admin',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/availability')
      .set(buildHeaders({
        role: 'ORGUNIT_ADMIN',
        userId: 'user-connectshyft-alpha-admin',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_AVAILABILITY_RESOLVED',
      data: {
        flags: {
          connectshyft_enabled: true,
          connectshyft_inbox_enabled: true,
          connectshyft_escalation_enabled: true,
          connectshyft_webhooks_enabled: true,
        },
        entitlement: null,
        capabilities: {
          module: true,
          inbox: true,
          escalation: true,
          webhooks: true,
        },
        telephonyReadiness: {
          voiceReady: true,
          smsReady: false,
          degradedMode: true,
          blockingReasonCount: 1,
        },
      },
    });
  });

  it('preserves the availability response contract while surfacing only summary readiness fields', async () => {
    const app = buildApp({
      defaultRole: 'ORGUNIT_ADMIN',
      defaultUserId: 'user-connectshyft-alpha-admin',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/availability')
      .set(buildHeaders({
        role: 'ORGUNIT_ADMIN',
        userId: 'user-connectshyft-alpha-admin',
      }));

    expect(response.status).toBe(200);
    expect(response.body.data.telephonyReadiness).toMatchObject({
      voiceReady: true,
      smsReady: false,
      degradedMode: true,
      blockingReasonCount: 1,
    });
    expect(response.body.data.callbackNumberConfigured).toBeUndefined();
    expect(response.body.data.callbackNumberNormalized).toBeUndefined();
    expect(response.body.data.blockingReasons).toBeUndefined();
    expect(response.body.data.nextActions).toBeUndefined();
  });

  it('preserves the availability refusal payload for callers without admin settings access', async () => {
    const app = buildApp({
      defaultRole: 'UNAUTHORIZED',
      defaultUserId: 'user-connectshyft-alpha-unauthorized',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/availability')
      .set(buildHeaders({
        role: 'UNAUTHORIZED',
        userId: 'user-connectshyft-alpha-unauthorized',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_AVAILABILITY_FORBIDDEN',
      refusalType: 'business',
      data: {
        flags: {
          connectshyft_enabled: true,
          connectshyft_inbox_enabled: true,
          connectshyft_escalation_enabled: true,
          connectshyft_webhooks_enabled: true,
        },
        entitlement: null,
        capabilities: {
          module: true,
          inbox: true,
          escalation: true,
          webhooks: true,
        },
      },
    });
    expect(response.body.data.telephonyReadiness).toBeUndefined();
  });
});
