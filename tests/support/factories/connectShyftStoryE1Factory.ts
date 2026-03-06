import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryE1ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryE1HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  flags?: ConnectShyftFlags;
  orgUnitMemberships?: string[];
  requestedProvider?: string | null;
  enabledProviders?: string[];
  disabledProviders?: string[];
};

export type StoryE1Context = {
  storyId: 'e-1';
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
  };
  providers: {
    enabledPrimary: 'telnyx';
    enabledSecondary: 'mock-sandbox';
    disabled: 'twilio';
  };
  numbers: {
    mappedInbound: string;
    mappedOutbound: string;
    unmappedInbound: string;
  };
  refusalCodes: {
    signatureMissing: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING';
    signatureInvalid: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID';
    correlationNotFound: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND';
  };
  canonicalEventTypes: {
    messageDelivered: 'MessageDelivered';
    callConnected: 'CallConnected';
  };
  flags: ConnectShyftFlags;
  paths: {
    threads: string;
    inboundWebhook: string;
    numbersCollection: string;
    threadDetailUi: string;
  };
};

const DEFAULT_FLAGS: ConnectShyftFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

let storyE1ContextCounter = 0;

const nextStoryE1Token = (): string => {
  storyE1ContextCounter += 1;
  return storyE1ContextCounter.toString(16).padStart(8, '0');
};

export function createStoryE1Context(
  overrides: StoryE1ContextOverrides = {},
): StoryE1Context {
  return {
    storyId: 'e-1',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-f1',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-f1-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-e1-operator',
    adminUserId: 'user-connectshyft-e1-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-e1-${nextStoryE1Token()}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-e1-${nextStoryE1Token()}`,
    threadIds: {
      // Story e.1 ingress tests piggyback on known synthetic thread ids used by provider stories.
      unclaimed: 'thread-f1-unclaimed-1001',
      claimed: 'thread-f1-claimed-1002',
      closed: 'thread-f1-closed-1003',
    },
    providers: {
      enabledPrimary: 'telnyx',
      enabledSecondary: 'mock-sandbox',
      disabled: 'twilio',
    },
    numbers: {
      mappedInbound: '+12605550141',
      mappedOutbound: '+12605550142',
      unmappedInbound: '+12605550991',
    },
    refusalCodes: {
      signatureMissing: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
      signatureInvalid: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
      correlationNotFound: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND',
    },
    canonicalEventTypes: {
      messageDelivered: 'MessageDelivered',
      callConnected: 'CallConnected',
    },
    flags: { ...DEFAULT_FLAGS },
    paths: {
      threads: '/api/v1/connectshyft/threads',
      inboundWebhook: '/api/v1/connectshyft/webhooks/inbound',
      numbersCollection: '/api/v1/connectshyft/numbers',
      threadDetailUi: '/app/connectshyft/threads',
    },
  };
}

export function createStoryE1Headers(
  context: StoryE1Context,
  overrides: StoryE1HeaderOverrides = {},
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
    'x-test-connectshyft-enabled-providers': JSON.stringify(
      overrides.enabledProviders ?? [
        context.providers.enabledPrimary,
        context.providers.enabledSecondary,
      ],
    ),
    'x-test-connectshyft-disabled-providers': JSON.stringify(
      overrides.disabledProviders ?? [context.providers.disabled],
    ),
  };

  if (overrides.orgUnitMemberships) {
    resolvedHeaders['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(
      overrides.orgUnitMemberships,
    );
  }

  if (overrides.requestedProvider) {
    resolvedHeaders['x-test-connectshyft-provider-requested'] = overrides.requestedProvider;
  }

  return resolvedHeaders;
}
