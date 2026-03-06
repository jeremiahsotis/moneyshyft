import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryC4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryC4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryC4Context = {
  storyId: 'c-4';
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
    claimed: 'connectshyft.thread.claimed';
    takeover: 'connectshyft.thread.taken_over';
    closed: 'connectshyft.thread.closed';
    reopenedByUser: 'connectshyft.thread_reopened_by_user';
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

export function createStoryC4Context(
  overrides: StoryC4ContextOverrides = {},
): StoryC4Context {
  return {
    storyId: 'c-4',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-c4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-c4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-c4-operator',
    adminUserId: 'user-connectshyft-c4-admin',
    viewerUserId: 'user-connectshyft-c4-tenant-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-c4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-c4-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-c4-unclaimed-1001',
      claimed: 'thread-c4-claimed-1002',
      closed: 'thread-c4-closed-1003',
    },
    eventNames: {
      claimed: 'connectshyft.thread.claimed',
      takeover: 'connectshyft.thread.taken_over',
      closed: 'connectshyft.thread.closed',
      reopenedByUser: 'connectshyft.thread_reopened_by_user',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryC4Headers(
  context: StoryC4Context,
  overrides: StoryC4HeaderOverrides = {},
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
