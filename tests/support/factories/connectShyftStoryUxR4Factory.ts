import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryUxR4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  scopeId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryUxR4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryUxR4Context = {
  storyId: 'ux-r4';
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
    closedPrefersNo: string;
  };
  refusalCodes: {
    overrideRequired: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED';
    overrideInvalid: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID';
  };
  envelopeCodes: {
    success: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED';
    callSuccess: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED';
    error: 'CONNECTSHYFT_OUTBOUND_POLICY_GUARDRAIL_ERROR';
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

const normalizeScopeId = (value: string | undefined): string => {
  const normalized = (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  return normalized || 'default';
};

export function createStoryUxR4Context(
  overrides: StoryUxR4ContextOverrides = {},
): StoryUxR4Context {
  const scopeId = normalizeScopeId(overrides.scopeId);

  return {
    storyId: 'ux-r4',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-ux-r4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-ux-r4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-ux-r4-operator',
    adminUserId: 'user-connectshyft-ux-r4-admin',
    viewerUserId: 'user-connectshyft-ux-r4-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-ux-r4-${scopeId}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-ux-r4-${scopeId}`,
    threadIds: {
      unclaimed: '1641c3dd-4d4c-4997-8b72-ae4876649b37',
      claimed: '69c239d2-8f02-4202-8cec-a7f0de61cbf7',
      closed: 'aedcda71-42b7-4857-8a0a-70013e01d4cd',
      unclaimedPrefersNo: '21f2866f-37ff-42da-80fc-0b5d2c3bc09d',
      closedPrefersNo: 'e37b00e0-228f-43c0-8c70-b3d0a5bfad40',
    },
    refusalCodes: {
      overrideRequired: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
      overrideInvalid: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
    },
    envelopeCodes: {
      success: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
      callSuccess: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
      error: 'CONNECTSHYFT_OUTBOUND_POLICY_GUARDRAIL_ERROR',
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

export function createStoryUxR4Headers(
  context: StoryUxR4Context,
  overrides: StoryUxR4HeaderOverrides = {},
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
