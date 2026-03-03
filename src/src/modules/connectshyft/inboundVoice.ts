import type { ConnectShyftThreadState } from './threads';

const CONNECTSHYFT_INBOUND_VOICE_FROM_KEYS = [
  'from',
  'fromNumber',
  'from_number',
  'caller',
  'callerNumber',
  'caller_number',
] as const;

const CONNECTSHYFT_INBOUND_VOICE_TO_KEYS = [
  'to',
  'toNumber',
  'to_number',
  'recipient',
  'recipientNumber',
  'recipient_number',
] as const;

const CONNECTSHYFT_INBOUND_VOICE_NEIGHBOR_KEYS = [
  'neighborId',
  'neighbor_id',
] as const;

const CONNECTSHYFT_INBOUND_VOICE_RECORDING_URL_KEYS = [
  'recordingUrl',
  'recording_url',
] as const;

const CONNECTSHYFT_INBOUND_VOICE_DURATION_KEYS = [
  'voicemail_duration_seconds',
  'duration_seconds',
  'durationSeconds',
  'duration',
] as const;

export const CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME = 'connectshyft.inbound.voice_voicemail_recorded' as const;
export const CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME = 'connectshyft.inbound.voice_fallback_recorded' as const;
export const CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_REQUESTED_EVENT_NAME = 'connectshyft.voicemail.transcription_requested' as const;
export const CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME = 'connectshyft.voicemail.transcription_attached' as const;
export const CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME = 'connectshyft.voicemail.transcription' as const;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeDurationSeconds = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }

  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readFromSources = (
  sources: Array<Record<string, unknown> | null>,
  keys: readonly string[],
): string | null => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const normalized = normalizeString(source[key]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};

const readDurationFromSources = (
  sources: Array<Record<string, unknown> | null>,
  keys: readonly string[],
): number | null => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const normalized = normalizeDurationSeconds(source[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
};

const readWebhookSources = (webhookBody: unknown): Array<Record<string, unknown> | null> => {
  const payload = asRecord(webhookBody);
  const providerPayload = asRecord(payload?.providerPayload);
  const data = asRecord(payload?.data);
  const dataPayload = asRecord(data?.payload);

  return [payload, providerPayload, dataPayload, data];
};

export type ConnectShyftInboundVoiceRoutingDecision = 'voicemail_only' | 'intake_fallback' | 'accepted';

export type ConnectShyftInboundVoiceRoutingPolicy = {
  claimedMode?: 'orgunit_configured_mode';
};

export type ConnectShyftInboundVoiceArtifact = {
  channel: 'voice';
  direction: 'inbound';
  providerEventId: string | null;
  providerMessageId: string | null;
  providerLegId: string | null;
  from: string | null;
  to: string | null;
  recordingUrl: string | null;
  durationSeconds: number | null;
};

export type ConnectShyftInboundVoiceDomainEvent = {
  eventName:
    | typeof CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME
    | typeof CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME;
  routingDecision: ConnectShyftInboundVoiceRoutingDecision;
  deterministicOrdering: true;
  canonicalEventType: string;
  routingPolicy: ConnectShyftInboundVoiceRoutingPolicy;
  inboundVoiceArtifact: ConnectShyftInboundVoiceArtifact;
};

export type ConnectShyftVoicemailTranscriptionRequest = {
  requestQueued: true;
  queueName: typeof CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME;
  callbackCorrelation: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    providerEventId: string | null;
    providerLegId: string | null;
    voicemailArtifactId: string;
  };
};

export type ConnectShyftVoicemailTranscriptionCallbackCorrelation = {
  tenantId: string | null;
  orgUnitId: string | null;
  threadId: string | null;
  providerEventId: string | null;
  providerLegId: string | null;
  voicemailArtifactId: string | null;
};

export type ConnectShyftVoicemailTranscriptionCallbackPayload = {
  correlation: ConnectShyftVoicemailTranscriptionCallbackCorrelation;
  transcriptText: string | null;
};

const readRecordFromSources = (
  sources: Array<Record<string, unknown> | null>,
  keys: readonly string[],
): Record<string, unknown> | null => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const nested = asRecord(source[key]);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

export const extractConnectShyftInboundVoiceNeighborId = (
  webhookBody: unknown,
): string | null => {
  return readFromSources(
    readWebhookSources(webhookBody),
    CONNECTSHYFT_INBOUND_VOICE_NEIGHBOR_KEYS,
  );
};

export const isConnectShyftVoicemailTranscriptionCallbackEventType = (
  canonicalEventType: string,
): boolean => {
  const normalized = normalizeString(canonicalEventType).toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized.includes('transcription')
    && (normalized.includes('completed') || normalized.includes('callback'));
};

export const extractConnectShyftVoicemailTranscriptionCallbackPayload = (
  webhookBody: unknown,
): ConnectShyftVoicemailTranscriptionCallbackPayload => {
  const payload = asRecord(webhookBody);
  const providerPayload = asRecord(payload?.providerPayload);
  const data = asRecord(payload?.data);
  const dataPayload = asRecord(data?.payload);
  const sources = [payload, providerPayload, dataPayload, data];

  const callbackCorrelation = readRecordFromSources(sources, [
    'callbackCorrelation',
    'callback_correlation',
  ]);
  const correlationSources = [callbackCorrelation, ...sources];
  const transcriptRecord = readRecordFromSources(sources, ['transcript']);
  const transcriptText = readFromSources(
    [transcriptRecord, ...sources],
    [
      'text',
      'transcriptText',
      'transcript_text',
      'transcriptionText',
      'transcription_text',
    ],
  );

  return {
    correlation: {
      tenantId: readFromSources(correlationSources, ['tenantId', 'tenant_id']),
      orgUnitId: readFromSources(correlationSources, ['orgUnitId', 'org_unit_id']),
      threadId: readFromSources(correlationSources, ['threadId', 'thread_id']),
      providerEventId: readFromSources(correlationSources, ['providerEventId', 'provider_event_id']),
      providerLegId: readFromSources(correlationSources, ['providerLegId', 'provider_leg_id']),
      voicemailArtifactId: readFromSources(correlationSources, [
        'voicemailArtifactId',
        'voicemail_artifact_id',
        'artifactId',
        'artifact_id',
      ]),
    },
    transcriptText,
  };
};

export const resolveConnectShyftInboundVoiceRouting = (input: {
  normalizedEventType: string;
  threadState: ConnectShyftThreadState | null;
}): {
  eventName:
    | typeof CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME
    | typeof CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME;
  routingDecision: ConnectShyftInboundVoiceRoutingDecision;
  deterministicOrdering: true;
  routingPolicy: ConnectShyftInboundVoiceRoutingPolicy;
} => {
  const normalizedEventType = normalizeString(input.normalizedEventType).toLowerCase();
  const isFallbackEvent = normalizedEventType === 'voice.fallback' || normalizedEventType === 'voicefallback';

  if (isFallbackEvent || !input.threadState || input.threadState === 'CLOSED') {
    return {
      eventName: CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
      routingDecision: 'intake_fallback',
      deterministicOrdering: true,
      routingPolicy: {},
    };
  }

  if (input.threadState === 'CLAIMED') {
    return {
      eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
      routingDecision: 'accepted',
      deterministicOrdering: true,
      routingPolicy: {
        claimedMode: 'orgunit_configured_mode',
      },
    };
  }

  return {
    eventName: CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
    routingDecision: 'voicemail_only',
    deterministicOrdering: true,
    routingPolicy: {},
  };
};

export const mapConnectShyftInboundVoiceWebhookToDomainEvent = (input: {
  webhookBody: unknown;
  canonicalEventType: string;
  eventName:
    | typeof CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME
    | typeof CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME;
  routingDecision: ConnectShyftInboundVoiceRoutingDecision;
  providerEventId: string | null;
  providerMessageId: string | null;
  providerLegId: string | null;
  routingPolicy?: ConnectShyftInboundVoiceRoutingPolicy;
}): ConnectShyftInboundVoiceDomainEvent => {
  const sources = readWebhookSources(input.webhookBody);
  const from = readFromSources(sources, CONNECTSHYFT_INBOUND_VOICE_FROM_KEYS);
  const to = readFromSources(sources, CONNECTSHYFT_INBOUND_VOICE_TO_KEYS);
  const recordingUrl = readFromSources(sources, CONNECTSHYFT_INBOUND_VOICE_RECORDING_URL_KEYS);
  const durationSeconds = readDurationFromSources(sources, CONNECTSHYFT_INBOUND_VOICE_DURATION_KEYS);

  return {
    eventName: input.eventName,
    routingDecision: input.routingDecision,
    deterministicOrdering: true,
    canonicalEventType: normalizeString(input.canonicalEventType) || 'VoiceVoicemail',
    routingPolicy: input.routingPolicy || {},
    inboundVoiceArtifact: {
      channel: 'voice',
      direction: 'inbound',
      providerEventId: input.providerEventId,
      providerMessageId: input.providerMessageId,
      providerLegId: input.providerLegId,
      from,
      to,
      recordingUrl,
      durationSeconds,
    },
  };
};

export const buildConnectShyftInboundVoiceCanonicalPayload = (input: {
  domainEvent: ConnectShyftInboundVoiceDomainEvent;
  threadState: ConnectShyftThreadState | null;
  autoClaimApplied: boolean;
  voicemailArtifactId: string | null;
  transcription: ConnectShyftVoicemailTranscriptionRequest | null;
}): Record<string, unknown> => ({
  direction: 'inbound',
  channel: 'voice',
  eventType: input.domainEvent.canonicalEventType,
  eventName: input.domainEvent.eventName,
  routingDecision: input.domainEvent.routingDecision,
  deterministicOrdering: input.domainEvent.deterministicOrdering,
  threadState: input.threadState,
  autoClaimApplied: input.autoClaimApplied,
  voicemailArtifact: input.voicemailArtifactId
    ? {
      artifactId: input.voicemailArtifactId,
      ...input.domainEvent.inboundVoiceArtifact,
    }
    : null,
  transcription: input.transcription,
});

export const buildConnectShyftVoicemailTranscriptionRequest = (input: {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  providerEventId: string | null;
  providerLegId: string | null;
  voicemailArtifactId: string;
}): ConnectShyftVoicemailTranscriptionRequest => ({
  requestQueued: true,
  queueName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_QUEUE_NAME,
  callbackCorrelation: {
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
    providerEventId: input.providerEventId,
    providerLegId: input.providerLegId,
    voicemailArtifactId: input.voicemailArtifactId,
  },
});

export const buildConnectShyftVoicemailTranscriptionAttachedCanonicalPayload = (input: {
  eventType: string;
  voicemailArtifactId: string;
  transcriptText: string;
  callbackCorrelation: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
  };
}): Record<string, unknown> => ({
  direction: 'inbound',
  channel: 'voice',
  eventType: normalizeString(input.eventType) || 'VoiceTranscriptionCompleted',
  eventName: CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
  routingDecision: 'accepted',
  deterministicOrdering: true,
  metadata: {
    voicemailArtifactId: input.voicemailArtifactId,
    transcriptAvailable: true,
    transcriptText: input.transcriptText,
    callbackCorrelation: {
      tenantId: input.callbackCorrelation.tenantId,
      orgUnitId: input.callbackCorrelation.orgUnitId,
      threadId: input.callbackCorrelation.threadId,
    },
  },
  voicemailArtifact: {
    artifactId: input.voicemailArtifactId,
    transcription: {
      available: true,
      text: input.transcriptText,
    },
  },
  transcription: {
    available: true,
    text: input.transcriptText,
  },
});
