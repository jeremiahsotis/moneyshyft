import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryE5ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  isolationToken?: string;
};

type StoryE5HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
  requestedProvider?: string | null;
  enabledProviders?: string[];
  disabledProviders?: string[];
};

export type StoryE5Context = {
  storyId: 'e-5';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  receiptPolicyDays: 180;
  duplicateBurstCount: 24;
  latencyBudgetMs: 1200;
  providers: {
    enabledPrimary: 'telnyx';
    enabledSecondary: 'mock-sandbox';
    disabled: 'twilio';
  };
  numbers: {
    mappedInbound: string;
    mappedOutbound: string;
    unmappedInbound: string;
  };
  flags: ConnectShyftFlags;
  paths: {
    inboundWebhook: string;
    numbersCollection: string;
    threads: string;
    threadDetailUi: string;
    receiptCleanup: string;
    receiptMetrics: string;
    receiptLedger: string;
  };
  codes: {
    webhookAccepted: 'CONNECTSHYFT_WEBHOOK_ACCEPTED';
    retentionApplied: 'CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_APPLIED';
    metricsLoaded: 'CONNECTSHYFT_WEBHOOK_RECEIPT_METRICS_LOADED';
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

const buildStoryE5IsolationToken = (): string =>
  randomUUID().replace(/-/g, '').slice(0, 8);

const buildStoryE5Numbers = (token: string): StoryE5Context['numbers'] => {
  const seed = Number.parseInt(token, 16);
  const normalizeLocal = (offset: number): string => {
    const localNumber = 3000000 + ((seed + offset) % 6000000);
    return String(localNumber).padStart(7, '0');
  };

  return {
    mappedInbound: `+1317${normalizeLocal(0)}`,
    mappedOutbound: `+1317${normalizeLocal(1)}`,
    unmappedInbound: `+1317${normalizeLocal(2)}`,
  };
};

export function createStoryE5Context(
  overrides: StoryE5ContextOverrides = {},
): StoryE5Context {
  const isolationToken = overrides.isolationToken ?? buildStoryE5IsolationToken();

  return {
    storyId: 'e-5',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-e5',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-e5-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-e5-operator',
    adminUserId: 'user-connectshyft-e5-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-e5-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-e5-${randomUUID().slice(0, 8)}`,
    receiptPolicyDays: 180,
    duplicateBurstCount: 24,
    latencyBudgetMs: 1200,
    providers: {
      enabledPrimary: 'telnyx',
      enabledSecondary: 'mock-sandbox',
      disabled: 'twilio',
    },
    numbers: buildStoryE5Numbers(isolationToken),
    flags: { ...DEFAULT_FLAGS },
    paths: {
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      numbersCollection: '/api/v1/connectshyft/numbers',
      threads: '/api/v1/connectshyft/threads',
      threadDetailUi: '/app/connectshyft/threads',
      receiptCleanup: '/api/v1/connectshyft/admin/webhook-receipts/cleanup',
      receiptMetrics: '/api/v1/connectshyft/admin/webhook-receipts/metrics',
      receiptLedger: '/api/v1/connectshyft/admin/webhook-receipts',
    },
    codes: {
      webhookAccepted: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
      retentionApplied: 'CONNECTSHYFT_WEBHOOK_RECEIPT_RETENTION_APPLIED',
      metricsLoaded: 'CONNECTSHYFT_WEBHOOK_RECEIPT_METRICS_LOADED',
    },
  };
}

export function createStoryE5Headers(
  context: StoryE5Context,
  overrides: StoryE5HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId:
      overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
    role: overrides.role ?? context.role,
    userId: overrides.userId ?? context.userId,
    correlationId: overrides.correlationId ?? context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
  });

  const resolvedHeaders: Record<string, string> = {
    ...headers,
    'x-test-connectshyft-flags': JSON.stringify(overrides.flags ?? context.flags),
    'x-test-connectshyft-enabled-providers': JSON.stringify(
      overrides.enabledProviders ?? [
        context.providers.enabledPrimary,
        context.providers.enabledSecondary,
      ],
    ),
    'x-test-connectshyft-disabled-providers': JSON.stringify(
      overrides.disabledProviders ?? [context.providers.disabled],
    ),
  };

  if (overrides.orgUnitMemberships) {
    resolvedHeaders['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(
      overrides.orgUnitMemberships,
    );
  }

  if (overrides.requestedProvider) {
    resolvedHeaders['x-test-connectshyft-provider-requested'] =
      overrides.requestedProvider;
  }

  return resolvedHeaders;
}
