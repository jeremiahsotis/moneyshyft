// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { ConnectShyftEscalationConfigService } from '../../../../modules/connectshyft/escalationConfig';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-s11-escalation';
const TEST_ORG_UNIT_ID = 'org-connectshyft-s11-escalation-east';
const OTHER_ORG_UNIT_ID = 'org-connectshyft-s11-escalation-west';
const TEST_USER_ID = 'user-connectshyft-s11-escalation-admin';
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
  recipientDirectory?: string;
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
    : 'corr-connectshyft-escalation-config-characterization';
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

  if (options.recipientDirectory) {
    headers['x-test-connectshyft-recipient-directory'] = options.recipientDirectory;
  }

  return headers;
};

const RECIPIENT_DIRECTORY_HEADER = JSON.stringify({
  orgUnitRecipients: [
    {
      userId: 'user-connectshyft-s11-escalation-primary',
      label: 'Primary Escalation Admin',
    },
    {
      userId: 'user-connectshyft-s11-escalation-secondary',
      label: 'Secondary Escalation Admin',
    },
  ],
  tenantRecipients: [
    {
      userId: 'user-connectshyft-s11-escalation-tenant-staff',
      label: 'Tenant Escalation Staff',
    },
  ],
});

describe('connectshyft escalation config route characterization', () => {
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

  it('returns the current escalation recipient options response shape', async () => {
    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/escalation/recipients')
      .set(buildHeaders({
        recipientDirectory: RECIPIENT_DIRECTORY_HEADER,
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_RECIPIENTS_RESOLVED',
      message: 'ConnectShyft escalation recipients resolved',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        recipientOptions: [
          {
            value: 'user-connectshyft-s11-escalation-primary',
            label: 'Primary Escalation Admin',
            scope: 'ORG_UNIT',
          },
          {
            value: 'user-connectshyft-s11-escalation-secondary',
            label: 'Secondary Escalation Admin',
            scope: 'ORG_UNIT',
          },
          {
            value: 'user-connectshyft-s11-escalation-tenant-staff',
            label: 'Tenant Escalation Staff',
            scope: 'TENANT',
          },
        ],
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'orgUnitId',
      'recipientOptions',
    ].sort());
    expect(Object.keys(response.body.data.recipientOptions[0]).sort()).toEqual([
      'label',
      'scope',
      'value',
    ].sort());
  });

  it('returns the current escalation config response shape', async () => {
    const getConfigSpy = jest.spyOn(
      ConnectShyftEscalationConfigService.prototype,
      'getConfig',
    ).mockResolvedValue({
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      escalationBaselineHours: 8,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
        tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
      },
      createdAtUtc: '2026-03-20T11:00:00.000Z',
      updatedAtUtc: '2026-03-20T12:00:00.000Z',
    } as any);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/escalation/config')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
      message: 'ConnectShyft escalation configuration resolved',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: 8,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
        updatedAtUtc: '2026-03-20T12:00:00.000Z',
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'escalationBaselineHours',
      'orgUnitId',
      'recipients',
      'updatedAtUtc',
    ].sort());
    expect(Object.keys(response.body.data.recipients).sort()).toEqual([
      'primaryOrgUnitAdminUserId',
      'secondaryOrgUnitAdminUserId',
      'tenantStaffUserId',
    ].sort());
    expect(getConfigSpy).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_ORG_UNIT_ID);
  });

  it('returns the current escalation config save success envelope', async () => {
    const saveConfigSpy = jest.spyOn(
      ConnectShyftEscalationConfigService.prototype,
      'saveConfig',
    ).mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      httpStatus: 200,
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: 6,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
        updatedAtUtc: '2026-03-20T13:00:00.000Z',
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/escalation/config')
      .set(buildHeaders({
        recipientDirectory: RECIPIENT_DIRECTORY_HEADER,
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: 6,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
      message: 'ConnectShyft escalation settings saved',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: 6,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
        updatedAtUtc: '2026-03-20T13:00:00.000Z',
      },
    });
    expect(saveConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      escalationBaselineHours: 6,
      recipients: {
        primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
        secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
        tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
      },
      recipientDirectory: expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'user-connectshyft-s11-escalation-primary',
            label: 'Primary Escalation Admin',
            scope: 'ORG_UNIT',
          }),
          expect.objectContaining({
            value: 'user-connectshyft-s11-escalation-tenant-staff',
            label: 'Tenant Escalation Staff',
            scope: 'TENANT',
          }),
        ]),
      }),
    }));
  });

  it('preserves the current escalation config validation refusal envelope', async () => {
    const saveConfigSpy = jest.spyOn(
      ConnectShyftEscalationConfigService.prototype,
      'saveConfig',
    ).mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
      message: 'Use whole hours between 1 and 24.',
      data: {
        fieldErrors: [
          {
            field: 'escalationBaselineHours',
            reason: 'NOT_INTEGER',
            message: 'Use whole hours between 1 and 24.',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/escalation/config')
      .set(buildHeaders({
        recipientDirectory: RECIPIENT_DIRECTORY_HEADER,
      }))
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        escalationBaselineHours: 2.5,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
      message: 'Use whole hours between 1 and 24.',
      refusalType: 'business',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'escalationBaselineHours',
            reason: 'NOT_INTEGER',
            message: 'Use whole hours between 1 and 24.',
          }),
        ],
      },
    });
    expect(saveConfigSpy).toHaveBeenCalledWith(expect.objectContaining({
      escalationBaselineHours: 2.5,
    }));
  });

  it('preserves the current escalation capability refusal for non-admin callers', async () => {
    const getConfigSpy = jest.spyOn(
      ConnectShyftEscalationConfigService.prototype,
      'getConfig',
    );

    const app = buildApp({
      defaultRole: 'ORGUNIT_MEMBER',
      defaultUserId: 'user-connectshyft-s11-escalation-member',
    });
    const response = await request(app)
      .get('/api/v1/connectshyft/escalation/recipients')
      .set(buildHeaders({
        role: 'ORGUNIT_MEMBER',
        userId: 'user-connectshyft-s11-escalation-member',
      }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
      message: 'Escalation configuration requires an authorized orgUnit role.',
      refusalType: 'business',
    });
    expect(getConfigSpy).not.toHaveBeenCalled();
  });

  it('preserves the current escalation orgUnit scope refusal when body scope overrides the active orgUnit', async () => {
    const saveConfigSpy = jest.spyOn(
      ConnectShyftEscalationConfigService.prototype,
      'saveConfig',
    );

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/escalation/config')
      .set(buildHeaders({
        recipientDirectory: RECIPIENT_DIRECTORY_HEADER,
      }))
      .send({
        orgUnitId: OTHER_ORG_UNIT_ID,
        escalationBaselineHours: 6,
        recipients: {
          primaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-primary',
          secondaryOrgUnitAdminUserId: 'user-connectshyft-s11-escalation-secondary',
          tenantStaffUserId: 'user-connectshyft-s11-escalation-tenant-staff',
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit context overrides are not allowed for this route',
      refusalType: 'business',
    });
    expect(saveConfigSpy).not.toHaveBeenCalled();
  });
});
