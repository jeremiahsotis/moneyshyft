import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryC3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryC3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryC3Context = {
  storyId: 'c-3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
    voicemailClaimed: string;
  };
  flags: ConnectShyftFlags;
  urgencyLabels: {
    stage0: '';
    stage1: 'Needs attention soon';
    stage2Plus: 'Needs urgent attention';
  };
  actionSets: {
    UNCLAIMED: readonly ['Call', 'Text', 'Claim'];
    CLAIMED: readonly ['Call', 'Text', 'Close'];
    CLOSED: readonly ['Call', 'Send Message'];
  };
  paths: {
    inbox: string;
    threadDetail: string;
    inboxUi: string;
    mineUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryC3Context(
  overrides: StoryC3ContextOverrides = {},
): StoryC3Context {
  return {
    storyId: 'c-3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-c3',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-c3-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-c3-operator',
    correlationId:
      overrides.correlationId ?? `corr-story-c3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-c3-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-c3-unclaimed-1001',
      claimed: 'thread-c3-claimed-1002',
      closed: 'thread-c3-closed-1003',
      voicemailClaimed: 'thread-c3-claimed-voicemail-1004',
    },
    flags: { ...DEFAULT_FLAGS },
    urgencyLabels: {
      stage0: '',
      stage1: 'Needs attention soon',
      stage2Plus: 'Needs urgent attention',
    },
    actionSets: {
      UNCLAIMED: ['Call', 'Text', 'Claim'],
      CLAIMED: ['Call', 'Text', 'Close'],
      CLOSED: ['Call', 'Send Message'],
    },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
    },
  };
}

export function createStoryC3Headers(
  context: StoryC3Context,
  overrides: StoryC3HeaderOverrides = {},
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
