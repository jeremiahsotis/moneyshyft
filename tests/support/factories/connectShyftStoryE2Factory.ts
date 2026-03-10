import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryE2ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryE2HeaderOverrides = {
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

export type StoryE2Context = {
  storyId: 'e-2';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  neighborIds: {
    existingActive: string;
    inboundCreate: string;
    inboundDuplicate: string;
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
  eventNames: {
    inboundSmsAppended: 'connectshyft.inbound.sms_appended';
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

export function createStoryE2Context(
  overrides: StoryE2ContextOverrides = {},
): StoryE2Context {
  return {
    storyId: 'e-2',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-e2',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-e2-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-e2-operator',
    adminUserId: 'user-connectshyft-e2-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-e2-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-e2-${randomUUID().slice(0, 8)}`,
    neighborIds: {
      existingActive: 'c615fb03-4216-4694-8d74-0307e3b3a067',
      inboundCreate: '9d20a1a0-3443-4732-8da7-37e8e96e603b',
      inboundDuplicate: '003929f6-8a22-4262-8ac3-0d2f8a5f7bc1',
    },
    providers: {
      enabledPrimary: 'telnyx',
      enabledSecondary: 'mock-sandbox',
      disabled: 'twilio',
    },
    numbers: {
      mappedInbound: '+12605550161',
      mappedOutbound: '+12605550162',
      unmappedInbound: '+12605550961',
    },
    eventNames: {
      inboundSmsAppended: 'connectshyft.inbound.sms_appended',
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

export function createStoryE2Headers(
  context: StoryE2Context,
  overrides: StoryE2HeaderOverrides = {},
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
