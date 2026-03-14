import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryC5ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  threadId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryC5HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

type StoryC5Recipients = {
  primaryOrgUnitAdminUserId: string;
  secondaryOrgUnitAdminUserId: string;
  tenantStaffUserId: string;
};

export type StoryC5Context = {
  storyId: 'c-5';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  schedulerUserId: string;
  correlationId: string;
  csrfToken: string;
  threadId: string;
  escalationBaselineHours: {
    default: 24;
    valid: 6;
    invalidFractional: 2.5;
    invalidLow: 0;
    invalidHigh: 25;
  };
  recipients: StoryC5Recipients;
  flags: ConnectShyftFlags;
  paths: {
    schedulerEvaluate: string;
    escalationConfig: string;
    threadClaim: string;
    inboxUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryC5Context(
  overrides: StoryC5ContextOverrides = {},
): StoryC5Context {
  const contextSuffix = randomUUID().slice(0, 8);
  const tenantId = overrides.tenantId ?? 'tenant-connectshyft-c5';
  const orgUnitId = overrides.orgUnitId ?? `org-connectshyft-c5-${contextSuffix}`;
  const threadId = overrides.threadId ?? randomUUID();

  return {
    storyId: 'c-5',
    tenantId,
    orgUnitId,
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-c5-operator',
    schedulerUserId: 'user-connectshyft-c5-scheduler',
    correlationId:
      overrides.correlationId ?? `corr-story-c5-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-c5-${randomUUID().slice(0, 8)}`,
    threadId,
    escalationBaselineHours: {
      default: 24,
      valid: 6,
      invalidFractional: 2.5,
      invalidLow: 0,
      invalidHigh: 25,
    },
    recipients: {
      primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
      secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
      tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      schedulerEvaluate: '/api/v1/connectshyft/internal/escalation/evaluate',
      escalationConfig: '/api/v1/connectshyft/escalation/config',
      threadClaim: `/api/v1/connectshyft/threads/${threadId}/claim`,
      inboxUi: '/app/connectshyft/inbox',
    },
  };
}

export function createStoryC5Headers(
  context: StoryC5Context,
  overrides: StoryC5HeaderOverrides = {},
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
