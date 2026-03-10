import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryD1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryD1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryD1Context = {
  storyId: 'd-1';
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
    claimed: 'connectshyft.thread.claimed';
    inboundFallback: 'connectshyft.inbound.voice_fallback_recorded';
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

export function createStoryD1Context(
  overrides: StoryD1ContextOverrides = {},
): StoryD1Context {
  return {
    storyId: 'd-1',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-d1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-d1-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d1-operator',
    adminUserId: 'user-connectshyft-d1-admin',
    viewerUserId: 'user-connectshyft-d1-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-d1-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-d1-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: '5693c23c-0af5-49f1-8da9-6a5201c15bb9',
      claimed: 'f989691b-ff65-46a0-8442-3ce02c35c5c4',
      closed: '1457b99b-40c7-40dc-838c-4acbb57696e7',
    },
    eventNames: {
      reopenedByUser: 'connectshyft.thread_reopened_by_user',
      claimed: 'connectshyft.thread.claimed',
      inboundFallback: 'connectshyft.inbound.voice_fallback_recorded',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryD1Headers(
  context: StoryD1Context,
  overrides: StoryD1HeaderOverrides = {},
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
