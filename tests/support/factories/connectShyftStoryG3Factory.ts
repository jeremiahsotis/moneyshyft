import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG3HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryG3Context = {
  storyId: 'g-3';
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
    voicemailClaimed: string;
  };
  expectedActions: {
    unclaimed: readonly ['Call', 'Text', 'Claim'];
    claimed: readonly ['Call', 'Text', 'Close'];
    closed: readonly ['Call', 'Send Message'];
  };
  requiredThreadDetailTestIds: readonly [
    'connectshyft-thread-primary-context-panel',
    'connectshyft-thread-context-neighbor',
    'connectshyft-thread-context-conference',
    'connectshyft-thread-context-claim',
    'connectshyft-thread-timeline',
    'connectshyft-thread-timeline-event-voicemail'
  ];
  contextualFeedbackTestIds: readonly [
    'connectshyft-policy-refusal-banner',
    'connectshyft-policy-error-banner',
    'connectshyft-policy-success-banner'
  ];
  forbiddenPersistentChromeTestIds: readonly [
    'connectshyft-thread-id-chip',
    'connectshyft-raw-state-chip',
    'connectshyft-system-metadata-chip',
    'connectshyft-thread-operations-banner'
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

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

export function createStoryG3Context(
  overrides: StoryG3ContextOverrides = {},
): StoryG3Context {
  return {
    storyId: 'g-3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-ux-r4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-ux-r4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-ux-r4-operator',
    adminUserId: 'user-connectshyft-ux-r4-admin',
    viewerUserId: 'user-connectshyft-ux-r4-viewer',
    correlationId:
      overrides.correlationId ?? `corr-story-g3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-g3-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: '1641c3dd-4d4c-4997-8b72-ae4876649b37',
      claimed: '69c239d2-8f02-4202-8cec-a7f0de61cbf7',
      closed: 'aedcda71-42b7-4857-8a0a-70013e01d4cd',
      unclaimedPrefersNo: '21f2866f-37ff-42da-80fc-0b5d2c3bc09d',
      closedPrefersNo: 'e37b00e0-228f-43c0-8c70-b3d0a5bfad40',
      voicemailClaimed: 'f5b54c4b-95a6-4201-8d2a-fa373d79e905',
    },
    expectedActions: {
      unclaimed: ['Call', 'Text', 'Claim'],
      claimed: ['Call', 'Text', 'Close'],
      closed: ['Call', 'Send Message'],
    },
    requiredThreadDetailTestIds: [
      'connectshyft-thread-primary-context-panel',
      'connectshyft-thread-context-neighbor',
      'connectshyft-thread-context-conference',
      'connectshyft-thread-context-claim',
      'connectshyft-thread-timeline',
      'connectshyft-thread-timeline-event-voicemail',
    ],
    contextualFeedbackTestIds: [
      'connectshyft-policy-refusal-banner',
      'connectshyft-policy-error-banner',
      'connectshyft-policy-success-banner',
    ],
    forbiddenPersistentChromeTestIds: [
      'connectshyft-thread-id-chip',
      'connectshyft-raw-state-chip',
      'connectshyft-system-metadata-chip',
      'connectshyft-thread-operations-banner',
    ],
    flags: { ...DEFAULT_FLAGS },
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

export function createStoryG3Headers(
  context: StoryG3Context,
  overrides: StoryG3HeaderOverrides = {},
): Record<string, string> {
  const headers = createTenantScopeHeaders({
    tenantId: overrides.tenantId ?? context.tenantId,
    orgUnitId:
      overrides.orgUnitId === undefined ? context.orgUnitId : overrides.orgUnitId,
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
