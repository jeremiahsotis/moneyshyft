// @ts-nocheck
import express from 'express';
import request from 'supertest';
import { connectShyftNumberMappingServiceAsync } from '../../../../modules/connectshyft/numberMappings';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const TEST_TENANT_ID = 'tenant-connectshyft-s11-number';
const TEST_ORG_UNIT_ID = 'org-connectshyft-s11-number-east';
const OTHER_ORG_UNIT_ID = 'org-connectshyft-s11-number-west';
const TEST_USER_ID = 'user-connectshyft-s11-number-admin';
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
    : 'corr-connectshyft-number-mappings-characterization';
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

const buildMapping = (overrides: Record<string, unknown> = {}) => ({
  mappingId: 'mapping-s11-number-1001',
  tenantId: TEST_TENANT_ID,
  orgUnitId: TEST_ORG_UNIT_ID,
  twilioNumberE164: '+12605550131',
  label: 'Primary Dispatch',
  isActive: true,
  createdAtUtc: '2026-03-20T10:00:00.000Z',
  updatedAtUtc: '2026-03-20T10:00:00.000Z',
  ...overrides,
});

describe('connectshyft number mappings route characterization', () => {
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

  it('returns the current number mapping list success envelope and normalized mapping contract', async () => {
    const listMappingsSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'listMappings',
    ).mockResolvedValue([
      buildMapping(),
      buildMapping({
        mappingId: 'mapping-s11-number-1002',
        twilioNumberE164: '+12605550132',
        label: 'Overflow Dispatch',
      }),
    ]);

    const app = buildApp();
    const response = await request(app)
      .get('/api/v1/connectshyft/numbers')
      .set(buildHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
      message: 'ConnectShyft number mappings resolved',
      data: {
        orgUnitId: TEST_ORG_UNIT_ID,
        mappings: [
          expect.objectContaining({
            mappingId: 'mapping-s11-number-1001',
            tenantId: TEST_TENANT_ID,
            orgUnitId: TEST_ORG_UNIT_ID,
            twilioNumberE164: '+12605550131',
            providerNumberE164: '+12605550131',
            label: 'Primary Dispatch',
            isActive: true,
          }),
          expect.objectContaining({
            mappingId: 'mapping-s11-number-1002',
            twilioNumberE164: '+12605550132',
            providerNumberE164: '+12605550132',
            label: 'Overflow Dispatch',
          }),
        ],
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'mappings',
      'orgUnitId',
    ].sort());
    expect(Object.keys(response.body.data.mappings[0]).sort()).toEqual([
      'createdAtUtc',
      'isActive',
      'label',
      'mappingId',
      'orgUnitId',
      'providerNumberE164',
      'tenantId',
      'twilioNumberE164',
      'updatedAtUtc',
    ].sort());
    expect(listMappingsSpy).toHaveBeenCalledWith(TEST_TENANT_ID, TEST_ORG_UNIT_ID);
  });

  it('returns the current create success envelope and save-path mapping contract', async () => {
    const createMappingSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'createMapping',
    ).mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      httpStatus: 201,
      data: {
        mappingId: 'mapping-s11-number-2001',
        orgUnitId: TEST_ORG_UNIT_ID,
        twilioNumberE164: '+12605550141',
        label: 'Night Dispatch',
        isActive: false,
        mappings: [
          buildMapping({
            mappingId: 'mapping-s11-number-2001',
            twilioNumberE164: '+12605550141',
            label: 'Night Dispatch',
            isActive: false,
          }),
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        providerNumberE164: '+12605550141',
        label: 'Night Dispatch',
        isActive: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
      message: 'ConnectShyft number mapping saved',
      data: {
        mappingId: 'mapping-s11-number-2001',
        orgUnitId: TEST_ORG_UNIT_ID,
        twilioNumberE164: '+12605550141',
        providerNumberE164: '+12605550141',
        label: 'Night Dispatch',
        isActive: false,
        mappings: [
          expect.objectContaining({
            mappingId: 'mapping-s11-number-2001',
            twilioNumberE164: '+12605550141',
            providerNumberE164: '+12605550141',
            isActive: false,
          }),
        ],
      },
    });
    expect(Object.keys(response.body.data).sort()).toEqual([
      'isActive',
      'label',
      'mappingId',
      'mappings',
      'orgUnitId',
      'providerNumberE164',
      'twilioNumberE164',
    ].sort());
    expect(createMappingSpy).toHaveBeenCalledWith({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      twilioNumberE164: '+12605550141',
      label: 'Night Dispatch',
      isActive: false,
    });
  });

  it('returns the current create refusal envelope with normalized provider field aliases', async () => {
    const createMappingSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'createMapping',
    ).mockResolvedValue({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164',
      message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
      data: {
        fieldErrors: [
          {
            field: 'twilioNumberE164',
            reason: 'INVALID_E164',
            message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
          },
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        providerNumberE164: '2605550141',
        label: 'Bad Number',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164',
      message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
      refusalType: 'business',
      data: {
        fieldErrors: [
          expect.objectContaining({
            field: 'twilioNumberE164',
            providerField: 'providerNumberE164',
            reason: 'INVALID_E164',
            message: 'Use a valid Twilio E.164 number (for example, +12605550111).',
          }),
        ],
      },
    });
    expect(Object.keys(response.body.data.fieldErrors[0]).sort()).toEqual([
      'field',
      'message',
      'providerField',
      'reason',
    ].sort());
    expect(createMappingSpy).toHaveBeenCalledWith({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      twilioNumberE164: '2605550141',
      label: 'Bad Number',
      isActive: true,
    });
  });

  it('preserves the current orgUnit scope refusal when create requests override the active orgUnit', async () => {
    const createMappingSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'createMapping',
    );

    const app = buildApp();
    const response = await request(app)
      .post('/api/v1/connectshyft/numbers')
      .set(buildHeaders())
      .send({
        orgUnitId: OTHER_ORG_UNIT_ID,
        providerNumberE164: '+12605550151',
        label: 'Cross Scope Mapping',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      message: 'Cross-orgUnit context overrides are not allowed for this route',
      refusalType: 'business',
    });
    expect(createMappingSpy).not.toHaveBeenCalled();
  });

  it('preserves the current missing mappingId refusal for update routes', async () => {
    const updateMappingSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'updateMapping',
    );

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/numbers/%20')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        providerNumberE164: '+12605550161',
        label: 'Missing Id Mapping',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_REQUIRED',
      message: 'mappingId is required',
      refusalType: 'client',
    });
    expect(updateMappingSpy).not.toHaveBeenCalled();
  });

  it('returns the current update success envelope and save-path contract', async () => {
    const updateMappingSpy = jest.spyOn(
      connectShyftNumberMappingServiceAsync,
      'updateMapping',
    ).mockResolvedValue({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
      httpStatus: 200,
      data: {
        mappingId: 'mapping-s11-number-3001',
        orgUnitId: TEST_ORG_UNIT_ID,
        twilioNumberE164: '+12605550171',
        label: 'Primary Dispatch Updated',
        isActive: true,
        mappings: [
          buildMapping({
            mappingId: 'mapping-s11-number-3001',
            twilioNumberE164: '+12605550171',
            label: 'Primary Dispatch Updated',
          }),
        ],
      },
    } as any);

    const app = buildApp();
    const response = await request(app)
      .put('/api/v1/connectshyft/numbers/mapping-s11-number-3001')
      .set(buildHeaders())
      .send({
        orgUnitId: TEST_ORG_UNIT_ID,
        twilioNumberE164: '+12605550171',
        label: 'Primary Dispatch Updated',
        isActive: true,
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
      message: 'ConnectShyft number mapping updated',
      data: {
        mappingId: 'mapping-s11-number-3001',
        orgUnitId: TEST_ORG_UNIT_ID,
        twilioNumberE164: '+12605550171',
        providerNumberE164: '+12605550171',
        label: 'Primary Dispatch Updated',
        isActive: true,
        mappings: [
          expect.objectContaining({
            mappingId: 'mapping-s11-number-3001',
            twilioNumberE164: '+12605550171',
            providerNumberE164: '+12605550171',
          }),
        ],
      },
    });
    expect(updateMappingSpy).toHaveBeenCalledWith({
      actorRoles: ['ORGUNIT_ADMIN'],
      tenantId: TEST_TENANT_ID,
      orgUnitId: TEST_ORG_UNIT_ID,
      mappingId: 'mapping-s11-number-3001',
      twilioNumberE164: '+12605550171',
      label: 'Primary Dispatch Updated',
      isActive: true,
    });
  });
});
