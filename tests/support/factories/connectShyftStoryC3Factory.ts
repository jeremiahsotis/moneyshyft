import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryC3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryC3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryC3Context = {
  storyId: 'c-3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
    voicemailClaimed: string;
  };
  flags: ConnectShyftFlags;
  urgencyLabels: {
    stage0: '';
    stage1: 'Needs attention soon';
    stage2Plus: 'Needs urgent attention';
  };
  actionSets: {
    UNCLAIMED: readonly ['Call', 'Text', 'Claim'];
    CLAIMED: readonly ['Call', 'Text', 'Close'];
    CLOSED: readonly ['Call', 'Send Message'];
  };
  paths: {
    inbox: string;
    threadDetail: string;
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

export function createStoryC3Context(
  overrides: StoryC3ContextOverrides = {},
): StoryC3Context {
  return {
    storyId: 'c-3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-c3',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-c3-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-c3-operator',
    correlationId:
      overrides.correlationId ?? `corr-story-c3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-c3-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: '90ca1c73-be82-48c6-8ba0-504e872ad211',
      claimed: '2686f12a-b7dc-4ab2-8de2-70b05684198b',
      closed: '47e2e20d-f3bc-4c0d-87a6-d3f0b0cbe69e',
      voicemailClaimed: '7ce62a91-60dd-4869-8816-d782f26b85d1',
    },
    flags: { ...DEFAULT_FLAGS },
    urgencyLabels: {
      stage0: '',
      stage1: 'Needs attention soon',
      stage2Plus: 'Needs urgent attention',
    },
    actionSets: {
      UNCLAIMED: ['Call', 'Text', 'Claim'],
      CLAIMED: ['Call', 'Text', 'Close'],
      CLOSED: ['Call', 'Send Message'],
    },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      threadDetailUi: '/app/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
    },
  };
}

export function createStoryC3Headers(
  context: StoryC3Context,
  overrides: StoryC3HeaderOverrides = {},
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
