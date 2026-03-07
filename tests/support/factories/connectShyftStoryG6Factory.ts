import { randomUUID } from 'node:crypto';
import { connectShyftCapabilityEnvelopeData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

const STORY_G6_DEFAULT_SCOPE = {
  tenantId: 'tenant-connectshyft-ux-r4',
  orgUnitId: 'org-connectshyft-ux-r4-east',
  volunteerUserId: 'user-connectshyft-ux-r4-operator',
  adminUserId: 'user-connectshyft-ux-r4-admin',
  viewerUserId: 'user-connectshyft-ux-r4-viewer',
} as const;

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG6ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG6HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

type StoryG6UrlActor = {
  role: string;
  userId: string;
  orgUnitMemberships: string[];
  orgUnitId?: string;
};

export type StoryG6Context = {
  storyId: 'g-6';
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
    unclaimedPrefersNo: string;
    claimed: string;
    mineVoicemail: string;
    closedOutbound: string;
    closedInbound: string;
  };
  neighborIds: {
    closedInbound: string;
  };
  events: {
    inboundMissedCall: 'voice.missed_inbound_call';
  };
  forbiddenPrimaryCopyTokens: readonly [
    'threadid',
    'thread_id',
    'priorityrank',
    'priority_rank',
    'routingmetadata',
    'routing_metadata',
    'webhookmetadata',
    'webhook_metadata',
    'systemmetadata',
    'system_metadata'
  ];
  forbiddenDisplayFields: readonly [
    'threadId',
    'priorityRank',
    'rawStateChip',
    'routingMetadata',
    'webhookMetadata',
    'systemMetadata'
  ];
  breakpoints: {
    mobile: { width: 390; height: 844 };
    tablet: { width: 834; height: 1112 };
    desktop: { width: 1440; height: 900 };
  };
  focusOrder: readonly [
    'connectshyft-queue-search-input',
    'connectshyft-queue-card-tap-target',
    'connectshyft-thread-card-primary-action'
  ];
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threads: string;
    inboundWebhook: string;
    inboxUi: string;
    mineUi: string;
    threadDetailUi: string;
  };
};

export function createStoryG6Context(
  overrides: StoryG6ContextOverrides = {},
): StoryG6Context {
  return {
    storyId: 'g-6',
    tenantId: overrides.tenantId ?? STORY_G6_DEFAULT_SCOPE.tenantId,
    orgUnitId: overrides.orgUnitId ?? STORY_G6_DEFAULT_SCOPE.orgUnitId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? STORY_G6_DEFAULT_SCOPE.volunteerUserId,
    adminUserId: STORY_G6_DEFAULT_SCOPE.adminUserId,
    viewerUserId: STORY_G6_DEFAULT_SCOPE.viewerUserId,
    correlationId: overrides.correlationId ?? `corr-story-g6-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story-g6-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-ux-r4-unclaimed-1001',
      unclaimedPrefersNo: 'thread-ux-r4-unclaimed-prefers-no-1004',
      claimed: 'thread-ux-r4-claimed-1002',
      mineVoicemail: 'thread-g1-voicemail-1004',
      closedOutbound: 'thread-ux-r4-closed-prefers-no-1005',
      closedInbound: 'thread-ux-r4-closed-1003',
    },
    neighborIds: {
      closedInbound: 'neighbor-connectshyft-ux-r4-1003',
    },
    events: {
      inboundMissedCall: 'voice.missed_inbound_call',
    },
    forbiddenPrimaryCopyTokens: [
      'threadid',
      'thread_id',
      'priorityrank',
      'priority_rank',
      'routingmetadata',
      'routing_metadata',
      'webhookmetadata',
      'webhook_metadata',
      'systemmetadata',
      'system_metadata',
    ],
    forbiddenDisplayFields: [
      'threadId',
      'priorityRank',
      'rawStateChip',
      'routingMetadata',
      'webhookMetadata',
      'systemMetadata',
    ],
    breakpoints: {
      mobile: { width: 390, height: 844 },
      tablet: { width: 834, height: 1112 },
      desktop: { width: 1440, height: 900 },
    },
    focusOrder: [
      'connectshyft-queue-search-input',
      'connectshyft-queue-card-tap-target',
      'connectshyft-thread-card-primary-action',
    ],
    flags: {
      ...connectShyftCapabilityEnvelopeData.flagsAllEnabled,
    },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryG6Headers(
  context: StoryG6Context,
  overrides: StoryG6HeaderOverrides = {},
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

export const buildStoryG6UrlParams = (
  context: StoryG6Context,
  actor: StoryG6UrlActor,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: actor.orgUnitId ?? context.orgUnitId,
    actorUserId: actor.userId,
    tenantRole: actor.role,
    orgUnitMemberships: actor.orgUnitMemberships.join(','),
  });

  return params.toString();
};

export const buildStoryG6SurfaceUrl = (
  context: StoryG6Context,
  bucket: 'inbox' | 'mine',
  actor: StoryG6UrlActor,
): string => {
  const path = bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${path}?${buildStoryG6UrlParams(context, actor)}&bucket=${bucket}`;
};

export const buildStoryG6ThreadDetailUrl = (
  context: StoryG6Context,
  threadId: string,
  actor: StoryG6UrlActor,
): string => {
  return `${context.paths.threadDetailUi}/${threadId}?${buildStoryG6UrlParams(context, actor)}`;
};
