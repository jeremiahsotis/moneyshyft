import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryC1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  neighborId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryC1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryC1Context = {
  storyId: 'c-1';
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  inboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  flags: ConnectShyftFlags;
  canonicalStates: readonly ['UNCLAIMED', 'CLAIMED', 'CLOSED'];
  paths: {
    threadsCollection: string;
    dueThreads: string;
    inboxUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

const CANONICAL_STATES = ['UNCLAIMED', 'CLAIMED', 'CLOSED'] as const;

export function createStoryC1Context(
  overrides: StoryC1ContextOverrides = {},
): StoryC1Context {
  return {
    storyId: 'c-1',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-c1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-c1-east',
    neighborId: overrides.neighborId ?? 'df5f35d6-5f36-49df-8205-26b5fdb65125',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-c1-operator',
    correlationId:
      overrides.correlationId ?? `corr-story-c1-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-c1-${randomUUID().slice(0, 8)}`,
    inboundCsNumberId: 'cs-inbound-c1-001',
    preferredOutboundCsNumberId: 'cs-outbound-c1-001',
    flags: { ...DEFAULT_FLAGS },
    canonicalStates: CANONICAL_STATES,
    paths: {
      threadsCollection: '/api/v1/connectshyft/threads',
      dueThreads: '/api/v1/connectshyft/internal/threads/due',
      inboxUi: '/app/connectshyft/inbox',
    },
  };
}

export function createStoryC1Headers(
  context: StoryC1Context,
  overrides: StoryC1HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId: overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
    role: overrides.role ?? context.role,
    userId: overrides.userId ?? context.userId,
    correlationId: overrides.correlationId ?? context.correlationId,
    csrfToken: overrides.csrfToken ?? context.csrfToken,
  });

  const resolvedHeaders: Record<string, string> = {
    ...headers,
    'x-test-connectshyft-flags': JSON.stringify(overrides.flags ?? context.flags),
  };

  if (overrides.orgUnitMemberships) {
    resolvedHeaders['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(
      overrides.orgUnitMemberships,
    );
  }

  return resolvedHeaders;
}
