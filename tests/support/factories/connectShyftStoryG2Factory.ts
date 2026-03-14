import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG2ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryG2Context = {
  storyId: 'g-2';
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
  forbiddenPrimaryCopyTokens: readonly [
    'threadid',
    'thread_id',
    'priorityrank',
    'priority_rank',
    'routingmetadata',
    'routing_metadata',
    'tenantid',
    'tenant_id',
    'orgunitid',
    'org_unit_id'
  ];
  readability: {
    minBodyTextPx: 16;
    minTapTargetPx: 44;
  };
  breakpoints: {
    mobile: { width: 390; height: 844 };
    tablet: { width: 834; height: 1112 };
    desktop: { width: 1280; height: 800 };
  };
  searchTerms: {
    persistent: string;
    voicemail: string;
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

export function createStoryG2Context(
  overrides: StoryG2ContextOverrides = {},
): StoryG2Context {
  return {
    storyId: 'g-2',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-g1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-g1-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-g1-operator',
    adminUserId: 'user-connectshyft-g1-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-g2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-g2-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: '04333bc3-018d-4fd3-84da-5d39a8767d30',
      claimed: '1e6b1c89-40ad-4a47-8e0a-784db5b0c9d8',
      closed: 'd78671f5-edc5-42af-86e0-97342ccc3968',
      voicemailClaimed: 'f5b54c4b-95a6-4201-8d2a-fa373d79e905',
    },
    forbiddenPrimaryCopyTokens: [
      'threadid',
      'thread_id',
      'priorityrank',
      'priority_rank',
      'routingmetadata',
      'routing_metadata',
      'tenantid',
      'tenant_id',
      'orgunitid',
      'org_unit_id',
    ],
    readability: {
      minBodyTextPx: 16,
      minTapTargetPx: 44,
    },
    breakpoints: {
      mobile: { width: 390, height: 844 },
      tablet: { width: 834, height: 1112 },
      desktop: { width: 1280, height: 800 },
    },
    searchTerms: {
      persistent: 'follow-up',
      voicemail: 'voicemail',
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

export function createStoryG2Headers(
  context: StoryG2Context,
  overrides: StoryG2HeaderOverrides = {},
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
