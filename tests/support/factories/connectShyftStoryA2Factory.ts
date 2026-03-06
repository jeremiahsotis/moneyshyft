import { randomUUID } from 'node:crypto';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryA2ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  threadId?: string;
};

type StoryA2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryA2Context = {
  storyId: 'a-2';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  threadId: string;
  crossTenantOrgUnitId: string;
  nonMemberUserId: string;
  tenantAdminUserId: string;
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadEnsure: string;
    threadClaim: string;
    threadTakeover: string;
    inboxUi: string;
  };
};

export function createStoryA2Context(
  overrides: StoryA2ContextOverrides = {},
): StoryA2Context {
  const threadId = overrides.threadId ?? 'thread-a2-1001';

  return {
    storyId: 'a-2',
    tenantId: overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    role: overrides.role ?? 'TENANT_STAFF',
    userId:
      overrides.userId
      ?? `story-a2-user-${randomUUID().slice(0, 8)}`,
    correlationId:
      overrides.correlationId
      ?? `corr-story-a2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken
      ?? `csrf-story-a2-${randomUUID().slice(0, 8)}`,
    threadId,
    crossTenantOrgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
    nonMemberUserId: connectShyftContextEnforcementData.nonMemberUserId,
    tenantAdminUserId: connectShyftContextEnforcementData.tenantAdminUserId,
    flags: { ...connectShyftContextEnforcementData.flagsAllEnabled },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadEnsure: '/api/v1/connectshyft/threads',
      threadClaim: `/api/v1/connectshyft/threads/${threadId}/claim`,
      threadTakeover: `/api/v1/connectshyft/threads/${threadId}/takeover`,
      inboxUi: '/app/connectshyft/inbox',
    },
  };
}

export function createStoryA2Headers(
  context: StoryA2Context,
  overrides: StoryA2HeaderOverrides = {},
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
