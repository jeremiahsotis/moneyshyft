import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryUxR3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryUxR3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryUxR3Context = {
  storyId: 'ux-r3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimedVoicemail: string;
    claimedVoicemail: string;
    closedVoice: string;
  };
  neighborIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
  };
  events: {
    inboundVoicemail: 'voice.voicemail';
    inboundMissedCall: 'voice.missed_inbound_call';
  };
  expectedLabels: {
    unclaimedVoicemail: 'Voicemail received';
    claimedVoicemail: 'Voicemail';
  };
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadDetail: string;
    inboundWebhook: string;
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

export function createStoryUxR3Context(
  overrides: StoryUxR3ContextOverrides = {},
): StoryUxR3Context {
  return {
    storyId: 'ux-r3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-ux-r3',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-ux-r3-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-ux-r3-operator',
    adminUserId: 'user-connectshyft-ux-r3-admin',
    correlationId: overrides.correlationId ?? 'corr-story-ux-r3-default',
    csrfToken: overrides.csrfToken ?? 'csrf-story-ux-r3-default',
    threadIds: {
      unclaimedVoicemail: 'c5d1de83-5a0e-45e0-8f25-eba1bd21a985',
      claimedVoicemail: 'b58069cc-1ab6-4ada-8a95-c468780a45a3',
      closedVoice: 'cba65a18-a1bc-45c3-838d-72f80135d6af',
    },
    neighborIds: {
      unclaimed: '2625dabf-6ec9-4310-842a-b1ef702f9804',
      claimed: '4a5dbc1f-e9dc-4e65-8d90-d43ba977ae8f',
      closed: 'd7c92906-d073-4c6c-8c31-773f8959780d',
    },
    events: {
      inboundVoicemail: 'voice.voicemail',
      inboundMissedCall: 'voice.missed_inbound_call',
    },
    expectedLabels: {
      unclaimedVoicemail: 'Voicemail received',
      claimedVoicemail: 'Voicemail',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      threadDetailUi: '/app/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
    },
  };
}

export function createStoryUxR3Headers(
  context: StoryUxR3Context,
  overrides: StoryUxR3HeaderOverrides = {},
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
