import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryUxR1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryUxR1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryUxR1Context = {
  storyId: 'ux-r1';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
    voicemailClaimed: string;
  };
  navModel: {
    primaryTabs: readonly ['Inbox', 'Mine', 'More'];
  };
  readability: {
    minBodyTextPx: 16;
    minTapTargetPx: 44;
  };
  actionSets: {
    UNCLAIMED: readonly ['Call', 'Text', 'Claim'];
    CLAIMED: readonly ['Call', 'Text', 'Close'];
    CLOSED: readonly ['Call', 'Send Message'];
  };
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadDetail: string;
    inboxUi: string;
    mineUi: string;
    threadDetailUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryUxR1Context(
  overrides: StoryUxR1ContextOverrides = {},
): StoryUxR1Context {
  return {
    storyId: 'ux-r1',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-ux-r1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-ux-r1-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-ux-r1-operator',
    adminUserId: 'user-connectshyft-ux-r1-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-ux-r1-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-ux-r1-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-ux-r1-unclaimed-1001',
      claimed: 'thread-ux-r1-claimed-1002',
      closed: 'thread-ux-r1-closed-1003',
      voicemailClaimed: 'thread-ux-r1-claimed-voicemail-1004',
    },
    navModel: {
      primaryTabs: ['Inbox', 'Mine', 'More'],
    },
    readability: {
      minBodyTextPx: 16,
      minTapTargetPx: 44,
    },
    actionSets: {
      UNCLAIMED: ['Call', 'Text', 'Claim'],
      CLAIMED: ['Call', 'Text', 'Close'],
      CLOSED: ['Call', 'Send Message'],
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryUxR1Headers(
  context: StoryUxR1Context,
  overrides: StoryUxR1HeaderOverrides = {},
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
