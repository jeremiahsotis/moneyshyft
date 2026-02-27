import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryD4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryD4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryD4Context = {
  storyId: 'd-4';
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
    unclaimedPrefersNo: string;
  };
  refusalCodes: {
    overrideRequired: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED';
  };
  eventNames: {
    reopenedByUser: 'connectshyft.thread_reopened_by_user';
  };
  flags: ConnectShyftFlags;
  paths: {
    threads: string;
    threadDetailUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryD4Context(
  overrides: StoryD4ContextOverrides = {},
): StoryD4Context {
  return {
    storyId: 'd-4',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-d4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-d4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d4-operator',
    adminUserId: 'user-connectshyft-d4-admin',
    viewerUserId: 'user-connectshyft-d4-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-d4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-d4-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-d4-unclaimed-1001',
      claimed: 'thread-d4-claimed-1002',
      closed: 'thread-d4-closed-1003',
      unclaimedPrefersNo: 'thread-d4-unclaimed-prefers-no-1004',
    },
    refusalCodes: {
      overrideRequired: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED',
    },
    eventNames: {
      reopenedByUser: 'connectshyft.thread_reopened_by_user',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryD4Headers(
  context: StoryD4Context,
  overrides: StoryD4HeaderOverrides = {},
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
