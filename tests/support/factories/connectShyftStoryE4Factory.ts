import { randomUUID } from 'node:crypto';
import { createTenantScopeHeaders } from './tenantRepositoryFactory';

export type ConnectShyftFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type StoryE4ContextOverrides = {
  tenantId?: string;
  orgUnitId?: string;
  role?: string;
  userId?: string;
  correlationId?: string;
  csrfToken?: string;
  isolationToken?: string;
};

type StoryE4HeaderOverrides = {
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

export type StoryE4Context = {
  storyId: 'e-4';
  tenantId: string;
  orgUnitId: string;
  role: string;
  userId: string;
  adminUserId: string;
  correlationId: string;
  csrfToken: string;
  neighborIds: {
    transcriptionTarget: string;
    missingCorrelationProbe: string;
    duplicateReplayProbe: string;
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
    transcriptionRequested: 'connectshyft.voicemail.transcription_requested';
    transcriptionAttached: 'connectshyft.voicemail.transcription_attached';
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

const buildStoryE4IsolationToken = (): string => randomUUID().replace(/-/g, '').slice(0, 8);

const buildStoryE4Numbers = (token: string): StoryE4Context['numbers'] => {
  const seed = Number.parseInt(token, 16);
  const normalizeLocal = (offset: number): string => {
    const localNumber = 3000000 + ((seed + offset) % 6000000);
    return String(localNumber).padStart(7, '0');
  };

  return {
    mappedInbound: `+1317${normalizeLocal(0)}`,
    mappedOutbound: `+1317${normalizeLocal(1)}`,
    unmappedInbound: `+1317${normalizeLocal(2)}`,
  };
};

export function createStoryE4Context(
  overrides: StoryE4ContextOverrides = {},
): StoryE4Context {
  const isolationToken = overrides.isolationToken ?? buildStoryE4IsolationToken();

  return {
    storyId: 'e-4',
    tenantId: overrides.tenantId ?? 'tenant-connectshyft-e4',
    orgUnitId: overrides.orgUnitId ?? 'org-connectshyft-e4-east',
    role: overrides.role ?? 'ORGUNIT_MEMBER',
    userId: overrides.userId ?? 'user-connectshyft-e4-operator',
    adminUserId: 'user-connectshyft-e4-admin',
    correlationId:
      overrides.correlationId ?? `corr-story-e4-${randomUUID().slice(0, 8)}`,
    csrfToken:
      overrides.csrfToken ?? `csrf-story-e4-${randomUUID().slice(0, 8)}`,
    neighborIds: {
      transcriptionTarget: `neighbor-connectshyft-e4-target-${isolationToken}`,
      missingCorrelationProbe: `neighbor-connectshyft-e4-missing-${isolationToken}`,
      duplicateReplayProbe: `neighbor-connectshyft-e4-duplicate-${isolationToken}`,
    },
    providers: {
      enabledPrimary: 'telnyx',
      enabledSecondary: 'mock-sandbox',
      disabled: 'twilio',
    },
    numbers: buildStoryE4Numbers(isolationToken),
    eventNames: {
      inboundVoiceVoicemail: 'connectshyft.inbound.voice_voicemail_recorded',
      transcriptionRequested: 'connectshyft.voicemail.transcription_requested',
      transcriptionAttached: 'connectshyft.voicemail.transcription_attached',
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

export function createStoryE4Headers(
  context: StoryE4Context,
  overrides: StoryE4HeaderOverrides = {},
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
