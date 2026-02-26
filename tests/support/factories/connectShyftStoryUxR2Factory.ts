import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryUxR2ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryUxR2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryUxR2Context = {
  storyId: 'ux-r2';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    claimed: string;
    closed: string;
  };
  readability: {
    minBodyTextPx: 16;
    minTapTargetPx: 44;
  };
  actionVerbSet: readonly ['Add', 'Call', 'Send', 'Claim', 'Close'];
  forbiddenCopyTokens: readonly ['rbac', 'uuid', 'org_unit', 'tenant_id', 'role_id'];
  focusOrder: readonly [
    'connectshyft-bottom-nav-inbox',
    'connectshyft-bottom-nav-mine',
    'connectshyft-thread-card-primary-action',
    'connectshyft-add-neighbor-action',
    'connectshyft-close-thread-action'
  ];
  outcomeTaxonomy: readonly ['success', 'refusal', 'error'];
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadDetail: string;
    addNeighbor: string;
    threadDetailUi: string;
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

export function createStoryUxR2Context(
  overrides: StoryUxR2ContextOverrides = {},
): StoryUxR2Context {
  return {
    storyId: 'ux-r2',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-ux-r2',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-ux-r2-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-ux-r2-operator',
    adminUserId: 'user-connectshyft-ux-r2-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-ux-r2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-ux-r2-${randomUUID().slice(0, 8)}`,
    threadIds: {
      claimed: 'thread-ux-r2-claimed-2001',
      closed: 'thread-ux-r2-closed-2002',
    },
    readability: {
      minBodyTextPx: 16,
      minTapTargetPx: 44,
    },
    actionVerbSet: ['Add', 'Call', 'Send', 'Claim', 'Close'],
    forbiddenCopyTokens: ['rbac', 'uuid', 'org_unit', 'tenant_id', 'role_id'],
    focusOrder: [
      'connectshyft-bottom-nav-inbox',
      'connectshyft-bottom-nav-mine',
      'connectshyft-thread-card-primary-action',
      'connectshyft-add-neighbor-action',
      'connectshyft-close-thread-action',
    ],
    outcomeTaxonomy: ['success', 'refusal', 'error'],
    flags: { ...DEFAULT_FLAGS },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      addNeighbor: '/api/v1/connectshyft/neighbors',
      threadDetailUi: '/app/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
    },
  };
}

export function createStoryUxR2Headers(
  context: StoryUxR2Context,
  overrides: StoryUxR2HeaderOverrides = {},
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
