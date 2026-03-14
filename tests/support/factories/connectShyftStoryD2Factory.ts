import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryD2ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryD2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryD2Context = {
  storyId: 'd-2';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  viewerUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimedPrefersNo: string;
    closedPrefersNo: string;
    claimedPrefersYes: string;
  };
  refusalCodes: {
    overrideRequired: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED';
    overrideInvalid: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_INVALID';
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

export function createStoryD2Context(
  overrides: StoryD2ContextOverrides = {},
): StoryD2Context {
  return {
    storyId: 'd-2',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-d2',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-d2-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d2-operator',
    adminUserId: 'user-connectshyft-d2-admin',
    viewerUserId: 'user-connectshyft-d2-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-d2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-d2-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimedPrefersNo: '04d4acdb-3bca-4020-8398-68092a7256d7',
      closedPrefersNo: '5c5546e2-3224-4b2c-8371-e40721f3b821',
      claimedPrefersYes: '9e115c59-e083-456e-871c-ba443653ae7b',
    },
    refusalCodes: {
      overrideRequired: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_REQUIRED',
      overrideInvalid: 'CONNECTSHYFT_OUTBOUND_OVERRIDE_REASON_INVALID',
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

export function createStoryD2Headers(
  context: StoryD2Context,
  overrides: StoryD2HeaderOverrides = {},
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
