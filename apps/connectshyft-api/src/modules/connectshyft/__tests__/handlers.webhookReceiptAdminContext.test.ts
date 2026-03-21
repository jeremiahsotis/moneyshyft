import type { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import { CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS } from '../providerCorrelationMappings';
import {
  resolveConnectShyftWebhookReceiptCleanupAccessContext,
  resolveConnectShyftWebhookReceiptMetricsAccessContext,
} from '../http/webhookReceiptAdminContext';
import * as accessContextModule from '../http/accessContext';

type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
};

const TEST_TENANT_ID = 'tenant-webhook-admin-context';
const TEST_ORG_UNIT_ID = 'org-webhook-admin-context-east';

const createRequest = (overrides: Partial<Request> = {}): Request => {
  const headers = Object.entries((overrides.headers || {}) as Record<string, string>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {},
  );

  return {
    body: {
      orgUnitId: TEST_ORG_UNIT_ID,
      policyWindowDays: '30',
      dryRun: false,
      asOfUtc: '2026-03-21T08:30:00.000Z',
      ...(overrides.body || {}),
    },
    query: {
      orgUnitId: TEST_ORG_UNIT_ID,
      retentionWindowDays: '30',
      asOfUtc: '2026-03-21T08:30:00.000Z',
      ...(overrides.query || {}),
    },
    user: {
      userId: 'user-webhook-admin-context-1001',
      role: 'ORGUNIT_ADMIN',
      activeTenantId: TEST_TENANT_ID,
      activeOrgUnitId: TEST_ORG_UNIT_ID,
      householdId: TEST_TENANT_ID,
      email: 'webhook-admin-context@test.local',
      ...(overrides.user || {}),
    },
    header: (name: string) => headers[name.toLowerCase()] || undefined,
    ...overrides,
  } as unknown as Request;
};

const createMockResponse = (): MockResponse => {
  const res = {
    locals: {
      responseEnvelope: {
        correlationId: 'corr-webhook-admin-context',
        tenantId: TEST_TENANT_ID,
      },
    },
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  return res;
};

describe('connectshyft webhook receipt admin helper boundary', () => {
  const resolvedContext = {
    tenantId: TEST_TENANT_ID,
    orgUnitId: TEST_ORG_UNIT_ID,
    bypassedOrgUnitMembership: false,
    effectiveRoles: ['ORGUNIT_ADMIN'],
  } as const;

  beforeEach(() => {
    jest.spyOn(accessContextModule, 'enforceConnectShyftCapability').mockResolvedValue({
      connectshyft_enabled: true,
      connectshyft_inbox_enabled: true,
      connectshyft_escalation_enabled: true,
      connectshyft_webhooks_enabled: true,
    } as any);
    jest.spyOn(accessContextModule, 'resolveConnectShyftRouteContextDecision').mockResolvedValue({
      ok: true,
      context: resolvedContext,
    } as any);
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValue(true);
    jest.spyOn(accessContextModule, 'respondWithConnectShyftContextRefusal').mockImplementation((res) => res);
    jest.spyOn(accessContextModule, 'sendConnectShyftRouteRefusal').mockImplementation((res) => res);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the scoped metrics prerequisites and keeps the metrics route query shape stable', async () => {
    const req = createRequest({
      query: {
        orgUnitId: `  ${TEST_ORG_UNIT_ID}  `,
        retentionWindowDays: '99999',
        asOfUtc: ' 2026-03-21T09:00:00.000Z ',
      } as any,
    });

    const context = await resolveConnectShyftWebhookReceiptMetricsAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      query: {
        orgUnitId: TEST_ORG_UNIT_ID,
        retentionWindowDays: 3650,
        asOfUtc: '2026-03-21T09:00:00.000Z',
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'context',
      'query',
    ]);
    expect(accessContextModule.resolveConnectShyftRouteContextDecision).toHaveBeenCalledWith(
      req,
      {
        attemptedOrgUnitId: TEST_ORG_UNIT_ID,
      },
    );
    expect(accessContextModule.requestHasAnyCapability).toHaveBeenCalledWith(
      req,
      [CAPABILITIES.NUMBER_MAPPING_MANAGE],
      resolvedContext,
    );
  });

  it('returns the scoped cleanup prerequisites and keeps cleanup parsing separate from metrics parsing', async () => {
    const req = createRequest({
      body: {
        orgUnitId: `  ${TEST_ORG_UNIT_ID}  `,
        policyWindowDays: '0',
        dryRun: 'true',
        asOfUtc: ' 2026-03-21T09:15:00.000Z ',
      } as any,
    });

    const context = await resolveConnectShyftWebhookReceiptCleanupAccessContext(
      req,
      createMockResponse(),
    );

    expect(context).toEqual({
      context: resolvedContext,
      payload: {
        orgUnitId: TEST_ORG_UNIT_ID,
        policyWindowDays: CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_POLICY_DAYS,
        dryRun: true,
        asOfUtc: '2026-03-21T09:15:00.000Z',
      },
    });
    expect(Object.keys(context || {}).sort()).toEqual([
      'context',
      'payload',
    ]);
  });

  it('short-circuits when capability prerequisites are unavailable before context resolution', async () => {
    jest.spyOn(accessContextModule, 'enforceConnectShyftCapability').mockResolvedValueOnce(null);

    const context = await resolveConnectShyftWebhookReceiptMetricsAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(accessContextModule.resolveConnectShyftRouteContextDecision).not.toHaveBeenCalled();
    expect(accessContextModule.requestHasAnyCapability).not.toHaveBeenCalled();
  });

  it('maps admin capability refusals to the current webhook-receipt admin refusal envelope', async () => {
    const sendRefusalSpy = accessContextModule.sendConnectShyftRouteRefusal as jest.MockedFunction<
      typeof accessContextModule.sendConnectShyftRouteRefusal
    >;
    jest.spyOn(accessContextModule, 'requestHasAnyCapability').mockReturnValueOnce(false);

    const context = await resolveConnectShyftWebhookReceiptCleanupAccessContext(
      createRequest(),
      createMockResponse(),
    );

    expect(context).toBeNull();
    expect(sendRefusalSpy).toHaveBeenCalledWith(expect.anything(), {
      code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
      message: 'Number mapping management requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
  });
});
