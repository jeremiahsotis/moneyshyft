import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryD4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryD4HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryD4Context = {
  storyId: 'd-4';
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

export function createStoryD4Context(
  overrides: StoryD4ContextOverrides = {},
): StoryD4Context {
  return {
    storyId: 'd-4',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-d4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-d4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-d4-operator',
    adminUserId: 'user-connectshyft-d4-admin',
    viewerUserId: 'user-connectshyft-d4-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-d4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-d4-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: '4332bb8e-940f-4927-8320-a8d3f3093d72',
      claimed: '0b3060e8-d0e1-4366-8655-8c7ec44cf0ee',
      closed: '20ab942f-27c6-4ae5-8af2-06b727c36b2a',
      unclaimedPrefersNo: '59b44eb4-c8e7-4cd1-8a22-bbeceb871dd7',
      closedPrefersNo: '06a77807-6575-4c63-8824-38a89f9dae12',
    },
    refusalCodes: {
      overrideRequired: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_REQUIRED',
      overrideInvalid: 'CONNECTSHYFT_SMS_OVERRIDE_REASON_INVALID',
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

export function createStoryD4Headers(
  context: StoryD4Context,
  overrides: StoryD4HeaderOverrides = {},
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
