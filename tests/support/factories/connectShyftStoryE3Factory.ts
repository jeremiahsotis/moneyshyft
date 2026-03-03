import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryE3ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type StoryE3HeaderOverrides = {
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

export type StoryE3Context = {
  storyId: 'e-3';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  neighborIds: {
    noActiveThread: string;
    voicemailUnclaimed: string;
    voicemailClaimed: string;
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
    inboundVoiceVoicemail: 'connectshyft.inbound.voice_voicemail_recorded';
    inboundVoiceFallback: 'connectshyft.inbound.voice_fallback_recorded';
    transcriptionRequested: 'connectshyft.voicemail.transcription_requested';
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

const buildStoryE3IsolationToken = (): string => randomUUID().replace(/-/g, '').slice(0, 8);

const buildStoryE3Numbers = (token: string): StoryE3Context['numbers'] => {
  const seed = Number.parseInt(token, 16);
  const normalizeLocal = (offset: number): string => {
    const localNumber = 2000000 + ((seed + offset) % 7000000);
    return String(localNumber).padStart(7, '0');
  };

  return {
    mappedInbound: `+1260${normalizeLocal(0)}`,
    mappedOutbound: `+1260${normalizeLocal(1)}`,
    unmappedInbound: `+1260${normalizeLocal(2)}`,
  };
};

export function createStoryE3Context(
  overrides: StoryE3ContextOverrides = {},
): StoryE3Context {
  const isolationToken = buildStoryE3IsolationToken();

  return {
    storyId: 'e-3',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-e3',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-e3-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-e3-operator',
    adminUserId: 'user-connectshyft-e3-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-e3-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-e3-${randomUUID().slice(0, 8)}`,
    neighborIds: {
      noActiveThread: `neighbor-connectshyft-e3-no-thread-${isolationToken}`,
      voicemailUnclaimed: `neighbor-connectshyft-e3-unclaimed-${isolationToken}`,
      voicemailClaimed: `neighbor-connectshyft-e3-claimed-${isolationToken}`,
    },
    providers: {
      enabledPrimary: 'telnyx',
      enabledSecondary: 'mock-sandbox',
      disabled: 'twilio',
    },
    numbers: buildStoryE3Numbers(isolationToken),
    eventNames: {
      inboundVoiceVoicemail: 'connectshyft.inbound.voice_voicemail_recorded',
      inboundVoiceFallback: 'connectshyft.inbound.voice_fallback_recorded',
      transcriptionRequested: 'connectshyft.voicemail.transcription_requested',
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

export function createStoryE3Headers(
  context: StoryE3Context,
  overrides: StoryE3HeaderOverrides = {},
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
    resolvedHeaders['x-test-connectshyft-provider-requested'] =
      overrides.requestedProvider;
  }

  return resolvedHeaders;
}
