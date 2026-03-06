import express from 'express';
import * as PlatformAdminService from '../../../../services/PlatformAdminService';
import db from '../../../../config/knex';
import { resetConnectShyftProviderCorrelationStateForTests } from '../../../../modules/connectshyft/providerCorrelationMappings';
import { responseEnvelope } from '../../../../platform/middleware/responseEnvelope';
import connectShyftRouter from '../connectshyft';

const CONNECTSHYFT_PROVIDER_REGISTRY_TEST_TENANT_IDS = [
  'tenant-connectshyft-f1',
  'tenant-connectshyft-f2',
  'tenant-connectshyft-allowlist-only',
] as const;

export const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(responseEnvelope);

  app.use((req, _res, next) => {
    const tenantId = req.header('x-test-connectshyft-tenant-id') || 'tenant-connectshyft-f1';
    const orgUnitId = req.header('x-test-connectshyft-orgunit-id') || 'org-connectshyft-f1-east';
    const role = req.header('x-test-connectshyft-role') || 'ORGUNIT_MEMBER';
    const userId = req.header('x-test-connectshyft-user-id') || 'user-connectshyft-f1-operator';

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

export const buildHeaders = (overrides: Record<string, string> = {}): Record<string, string> => ({
  'x-correlation-id': 'corr-connectshyft-f1-provider-registry',
  'x-test-connectshyft-flags': JSON.stringify({
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: true,
    connectshyft_escalation_enabled: true,
    connectshyft_webhooks_enabled: true,
  }),
  'x-test-connectshyft-tenant-id': 'tenant-connectshyft-f1',
  'x-test-connectshyft-orgunit-id': 'org-connectshyft-f1-east',
  'x-test-connectshyft-role': 'ORGUNIT_MEMBER',
  'x-test-connectshyft-user-id': 'user-connectshyft-f1-operator',
  'x-test-connectshyft-orgunit-memberships': JSON.stringify(['org-connectshyft-f1-east']),
  'x-test-connectshyft-enabled-providers': JSON.stringify(['telnyx', 'mock-sandbox']),
  'x-test-connectshyft-disabled-providers': JSON.stringify(['twilio']),
  ...overrides,
});

export type CanonicalEventRecord = {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAtUtc: string;
};

export const sortCanonical = (events: CanonicalEventRecord[]): CanonicalEventRecord[] => {
  return [...events].sort((left, right) => {
    const timeDelta = new Date(left.occurredAtUtc).getTime() - new Date(right.occurredAtUtc).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.eventId.localeCompare(right.eventId);
  });
};

export const expectProviderSpecificLeakageRemoved = (payload: Record<string, unknown>): void => {
  expect(payload).not.toHaveProperty('twilioCallSid');
  expect(payload).not.toHaveProperty('telnyxCallControlId');
  expect(payload).not.toHaveProperty('providerLegId');
  expect(payload).not.toHaveProperty('providerMessageId');
};

const resetProviderCorrelationDbStateForTests = async (): Promise<void> => {
  try {
    const testTenantIds = [...CONNECTSHYFT_PROVIDER_REGISTRY_TEST_TENANT_IDS];
    await db
      .withSchema('connectshyft')
      .table('cs_webhook_receipts')
      .whereIn('tenant_id', testTenantIds)
      .del();
    await db
      .withSchema('connectshyft')
      .table('cs_provider_identifier_mappings')
      .whereIn('tenant_id', testTenantIds)
      .del();
  } catch (_error) {
    // Ignore cleanup failures when db-backed tables are unavailable in isolated test runs.
  }
};

export const registerProviderRegistryRouteIntegrationHooks = (): void => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverrideFlag = process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS;
  const previousTelnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;
  const previousConnectShyftEnabled = process.env.CONNECTSHYFT_ENABLED;
  const previousConnectShyftInboxEnabled = process.env.CONNECTSHYFT_INBOX_ENABLED;
  const previousConnectShyftEscalationEnabled = process.env.CONNECTSHYFT_ESCALATION_ENABLED;
  const previousConnectShyftWebhooksEnabled = process.env.CONNECTSHYFT_WEBHOOKS_ENABLED;
  let entitlementSpy: jest.SpyInstance;

  beforeEach(async () => {
    resetConnectShyftProviderCorrelationStateForTests();
    await resetProviderCorrelationDbStateForTests();
  });

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS = 'true';
    process.env.CONNECTSHYFT_ENABLED = 'true';
    process.env.CONNECTSHYFT_INBOX_ENABLED = 'true';
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = 'true';
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = 'true';
    entitlementSpy = jest.spyOn(PlatformAdminService, 'evaluateActorTenantModuleEntitlement').mockResolvedValue({
      tenantId: 'tenant-connectshyft-f1',
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
    process.env.TELNYX_PUBLIC_KEY = previousTelnyxPublicKey;
    process.env.CONNECTSHYFT_ENABLED = previousConnectShyftEnabled;
    process.env.CONNECTSHYFT_INBOX_ENABLED = previousConnectShyftInboxEnabled;
    process.env.CONNECTSHYFT_ESCALATION_ENABLED = previousConnectShyftEscalationEnabled;
    process.env.CONNECTSHYFT_WEBHOOKS_ENABLED = previousConnectShyftWebhooksEnabled;
  });
};

export const withScopedEnv = async <T>(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<T> | T,
): Promise<T> => {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previousValues.set(key, process.env[key]);
    if (typeof value === 'undefined') {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previousValues.entries()) {
      if (typeof value === 'undefined') {
        delete process.env[key];
        continue;
      }
      process.env[key] = value;
    }
  }
};
