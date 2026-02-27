import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryD3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryD3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryD3Context = {
  storyId: 'd-3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  viewerUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
  };
  eventNames: {
    reopenedByUser: 'connectshyft.thread_reopened_by_user';
    closed: 'connectshyft.thread.closed';
    inboundFallback: 'connectshyft.inbound.voice_fallback_recorded';
  };
  refusalCodes: {
    policyRefusal: 'CONNECTSHYFT_OUTBOUND_POLICY_REFUSED';
    closeForbidden: 'CONNECTSHYFT_THREAD_CLOSE_FORBIDDEN';
  };
  flags: ConnectShyftFlags;
  paths: {
    threads: string;
    inboundWebhook: string;
    threadDetailUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryD3Context(
  overrides: StoryD3ContextOverrides = {},
): StoryD3Context {
  return {
    storyId: 'd-3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-d3',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-d3-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d3-operator',
    adminUserId: 'user-connectshyft-d3-admin',
    viewerUserId: 'user-connectshyft-d3-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-d3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-d3-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-d3-unclaimed-1001',
      claimed: 'thread-d3-claimed-1002',
      closed: 'thread-d3-closed-1003',
    },
    eventNames: {
      reopenedByUser: 'connectshyft.thread_reopened_by_user',
      closed: 'connectshyft.thread.closed',
      inboundFallback: 'connectshyft.inbound.voice_fallback_recorded',
    },
    refusalCodes: {
      policyRefusal: 'CONNECTSHYFT_OUTBOUND_POLICY_REFUSED',
      closeForbidden: 'CONNECTSHYFT_THREAD_CLOSE_FORBIDDEN',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryD3Headers(
  context: StoryD3Context,
  overrides: StoryD3HeaderOverrides = {},
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
