import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryG1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryG1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
};

export type StoryG1Context = {
  storyId: 'g-1';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  threadIds: {
    unclaimed: string;
    claimed: string;
    closed: string;
    voicemailClaimed: string;
  };
  tokenContract: {
    groups: readonly ['color', 'typography', 'spacing', 'radius', 'shadow', 'breakpoint'];
    requiredCssVars: readonly [
      '--cs-color-surface',
      '--cs-color-text-primary',
      '--cs-type-body-md',
      '--cs-space-4',
      '--cs-radius-card',
      '--cs-shadow-card',
      '--cs-breakpoint-mobile',
      '--cs-breakpoint-tablet',
      '--cs-breakpoint-desktop'
    ];
  };
  primitiveTestIds: readonly [
    'connectshyft-queue-card',
    'connectshyft-urgency-pill',
    'connectshyft-thread-header',
    'connectshyft-message-bubble',
    'connectshyft-voicemail-card',
    'connectshyft-composer',
    'connectshyft-thread-action-bar'
  ];
  forbiddenPrimaryCopyTokens: readonly [
    'threadid',
    'priorityrank',
    'routingmetadata',
    'tenantid',
    'orgunitid'
  ];
  readability: {
    minBodyTextPx: 16;
    minTapTargetPx: 44;
  };
  breakpoints: {
    mobile: { width: 390; height: 844 };
    tablet: { width: 834; height: 1112 };
    desktop: { width: 1280; height: 800 };
  };
  flags: ConnectShyftFlags;
  paths: {
    inbox: string;
    threadDetail: string;
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

export function createStoryG1Context(
  overrides: StoryG1ContextOverrides = {},
): StoryG1Context {
  return {
    storyId: 'g-1',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-g1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-g1-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-g1-operator',
    adminUserId: 'user-connectshyft-g1-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-g1-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-g1-${randomUUID().slice(0, 8)}`,
    threadIds: {
      unclaimed: 'thread-g1-unclaimed-1001',
      claimed: 'thread-g1-claimed-1002',
      closed: 'thread-g1-closed-1003',
      voicemailClaimed: 'thread-g1-voicemail-1004',
    },
    tokenContract: {
      groups: ['color', 'typography', 'spacing', 'radius', 'shadow', 'breakpoint'],
      requiredCssVars: [
        '--cs-color-surface',
        '--cs-color-text-primary',
        '--cs-type-body-md',
        '--cs-space-4',
        '--cs-radius-card',
        '--cs-shadow-card',
        '--cs-breakpoint-mobile',
        '--cs-breakpoint-tablet',
        '--cs-breakpoint-desktop',
      ],
    },
    primitiveTestIds: [
      'connectshyft-queue-card',
      'connectshyft-urgency-pill',
      'connectshyft-thread-header',
      'connectshyft-message-bubble',
      'connectshyft-voicemail-card',
      'connectshyft-composer',
      'connectshyft-thread-action-bar',
    ],
    forbiddenPrimaryCopyTokens: [
      'threadid',
      'priorityrank',
      'routingmetadata',
      'tenantid',
      'orgunitid',
    ],
    readability: {
      minBodyTextPx: 16,
      minTapTargetPx: 44,
    },
    breakpoints: {
      mobile: { width: 390, height: 844 },
      tablet: { width: 834, height: 1112 },
      desktop: { width: 1280, height: 800 },
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      inbox: '/api/v1/connectshyft/inbox',
      threadDetail: '/api/v1/connectshyft/threads',
      inboxUi: '/app/connectshyft/inbox',
      mineUi: '/app/connectshyft/mine',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryG1Headers(
  context: StoryG1Context,
  overrides: StoryG1HeaderOverrides = {},
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
