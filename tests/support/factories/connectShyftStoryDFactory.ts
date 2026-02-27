import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryDContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryDHeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryDContext = {
  storyId: 'epic-d';
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
    prefersNoUnclaimed: string;
    prefersNoClosed: string;
  };
  paths: {
    threads: string;
    inboundWebhook: string;
    threadDetailUi: string;
  };
  eventNames: {
    reopenedByUser: 'connectshyft.thread_reopened_by_user';
    inboundVoiceFallback: 'connectshyft.inbound.voice_fallback_recorded';
  };
  actionSets: {
    UNCLAIMED: readonly ['Call', 'Text', 'Claim'];
    CLAIMED: readonly ['Call', 'Text', 'Close'];
    CLOSED: readonly ['Call', 'Send Message'];
  };
  refusalCodes: {
    smsOverrideRequired: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED';
    smsOverrideInvalid: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID';
    outboundRefused: 'CONNECTSHYFT_OUTBOUND_POLICY_REFUSED';
  };
  flags: ConnectShyftFlags;
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryDContext(
  overrides: StoryDContextOverrides = {},
): StoryDContext {
  return {
    storyId: 'epic-d',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-c4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-c4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d-operator',
    adminUserId: 'user-connectshyft-d-admin',
    viewerUserId: 'user-connectshyft-d-viewer',
    correlationId: overrides.correlationId ?? `corr-story-d-${randomUUID().slice(0, 8)}`,
    csrfToken: overrides.csrfToken ?? `csrf-story-d-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-c4-unclaimed-1001',
      claimed: 'thread-c4-claimed-1002',
      closed: 'thread-c4-closed-1003',
      prefersNoUnclaimed: 'thread-c4-unclaimed-pref-no-1004',
      prefersNoClosed: 'thread-c4-closed-pref-no-1005',
    },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      threadDetailUi: '/app/connectshyft/threads',
    },
    eventNames: {
      reopenedByUser: 'connectshyft.thread_reopened_by_user',
      inboundVoiceFallback: 'connectshyft.inbound.voice_fallback_recorded',
    },
    actionSets: {
      UNCLAIMED: ['Call', 'Text', 'Claim'],
      CLAIMED: ['Call', 'Text', 'Close'],
      CLOSED: ['Call', 'Send Message'],
    },
    refusalCodes: {
      smsOverrideRequired: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
      smsOverrideInvalid: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
      outboundRefused: 'CONNECTSHYFT_OUTBOUND_POLICY_REFUSED',
    },
    flags: { ...DEFAULT_FLAGS },
  };
}

export function createStoryDHeaders(
  context: StoryDContext,
  overrides: StoryDHeaderOverrides = {},
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
