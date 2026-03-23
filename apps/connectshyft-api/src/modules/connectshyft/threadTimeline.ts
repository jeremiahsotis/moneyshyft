import type { Knex } from 'knex';
import {
  listConnectShyftCanonicalEvents,
  type ConnectShyftCanonicalEventRecord,
} from './canonicalEvents';
import { loadConnectShyftBridgeAggregateByThreadId } from './bridgeSessions';
import { CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME } from './inboundSms';
import {
  CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME,
  CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME,
  CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_REQUESTED_EVENT_NAME,
} from './inboundVoice';

export const CONNECTSHYFT_THREAD_TIMELINE_DEFAULT_LIMIT = 200;
export const CONNECTSHYFT_THREAD_TIMELINE_MAX_LIMIT = 200;
export const CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME = 'connectshyft.outbound.sms_appended' as const;
export const CONNECTSHYFT_OUTBOUND_SMS_EVENT_NAME_ALIAS = 'connectshyft.thread.outbound_message_dispatched' as const;
export const CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES = {
  started: 'connectshyft.voice.started',
  connected: 'connectshyft.voice.connected',
  ended: 'connectshyft.voice.ended',
  outboundDispatched: 'connectshyft.thread.outbound_call_dispatched',
} as const;

export type ConnectShyftThreadTimelineDirection = 'inbound' | 'outbound';
export type ConnectShyftThreadTimelineChannel = 'sms' | 'voice' | 'voicemail';
export type ConnectShyftThreadTimelineActor = 'system' | 'user' | 'neighbor';
export type ConnectShyftThreadTimelineItemType = 'message' | 'voice_event' | 'voicemail';

type ConnectShyftThreadTimelineItemBase = {
  id: string;
  threadId: string;
  direction: ConnectShyftThreadTimelineDirection;
  occurredAtUtc: string;
  actor: ConnectShyftThreadTimelineActor;
  providerMetadata: Record<string, unknown> | null;
  deliveryStatus: string | null;
};

export type ConnectShyftSmsTimelineItem = ConnectShyftThreadTimelineItemBase & {
  type: 'message';
  channel: 'sms';
  body: string;
};

export type ConnectShyftVoiceEventTimelineItem = ConnectShyftThreadTimelineItemBase & {
  type: 'voice_event';
  channel: 'voice';
  body: null;
};

export type ConnectShyftVoicemailTimelineItem = ConnectShyftThreadTimelineItemBase & {
  type: 'voicemail';
  channel: 'voicemail';
  body: null;
  recordingUrl: string | null;
  durationSeconds: number | null;
  transcript: string | null;
};

export type ConnectShyftThreadTimelineItem =
  | ConnectShyftSmsTimelineItem
  | ConnectShyftVoiceEventTimelineItem
  | ConnectShyftVoicemailTimelineItem;

export type ConnectShyftThreadTimelineResult = {
  threadId: string;
  source: 'canonical_events';
  deterministic: true;
  limitApplied: number;
  items: ConnectShyftThreadTimelineItem[];
};

export type GetThreadTimelineInput = {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  limit?: number | null;
  db?: Knex;
};

type TimelineEventMapper = (
  event: ConnectShyftCanonicalEventRecord,
  payload: Record<string, unknown>,
) => ConnectShyftThreadTimelineItem | null;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const normalizeDirection = (
  value: unknown,
): ConnectShyftThreadTimelineDirection | null => {
  return value === 'inbound' || value === 'outbound'
    ? value
    : null;
};

const normalizeActor = (
  value: unknown,
): ConnectShyftThreadTimelineActor | null => {
  return value === 'system' || value === 'user' || value === 'neighbor'
    ? value
    : null;
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

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  return normalized;
};

const resolveTimelineBase = (input: {
  event: ConnectShyftCanonicalEventRecord;
  payload: Record<string, unknown>;
  direction: ConnectShyftThreadTimelineDirection;
  actor: ConnectShyftThreadTimelineActor;
}): ConnectShyftThreadTimelineItemBase => ({
  id: input.event.eventId,
  threadId: input.event.aggregateId,
  direction: input.direction,
  occurredAtUtc: input.event.occurredAtUtc,
  actor: input.actor,
  providerMetadata: asRecord(input.payload.providerMetadata),
  deliveryStatus: normalizeString(input.payload.deliveryStatus) || null,
});

const resolveMessageArtifact = (
  payload: Record<string, unknown>,
  artifactKey: 'inboundMessageArtifact' | 'outboundMessageArtifact',
): Record<string, unknown> | null => {
  return asRecord(payload[artifactKey]);
};

const resolveVoiceOrVoicemailArtifact = (
  payload: Record<string, unknown>,
): Record<string, unknown> | null => {
  return asRecord(payload.voicemailArtifact);
};

const resolveTimelineActor = (input: {
  payload: Record<string, unknown>;
  fallbackDirection: ConnectShyftThreadTimelineDirection;
  outboundFallback?: 'system' | 'user';
}): ConnectShyftThreadTimelineActor => {
  const actor = normalizeActor(input.payload.actor);
  if (actor) {
    return actor;
  }

  if (input.fallbackDirection === 'inbound') {
    return 'neighbor';
  }

  return input.outboundFallback || 'system';
};

const mapInboundSmsTimelineEvent: TimelineEventMapper = (event, payload) => {
  const artifact = resolveMessageArtifact(payload, 'inboundMessageArtifact');
  const body = normalizeString(artifact?.body);
  if (!body) {
    return null;
  }

  return {
    ...resolveTimelineBase({
      event,
      payload,
      direction: 'inbound',
      actor: resolveTimelineActor({
        payload,
        fallbackDirection: 'inbound',
      }),
    }),
    type: 'message',
    channel: 'sms',
    body,
  };
};

const mapOutboundSmsTimelineEvent: TimelineEventMapper = (event, payload) => {
  const artifact = resolveMessageArtifact(payload, 'outboundMessageArtifact');
  const body = normalizeString(artifact?.body);
  if (!body) {
    return null;
  }

  return {
    ...resolveTimelineBase({
      event,
      payload,
      direction: 'outbound',
      actor: resolveTimelineActor({
        payload,
        fallbackDirection: 'outbound',
        outboundFallback: 'system',
      }),
    }),
    type: 'message',
    channel: 'sms',
    body,
  };
};

const mapVoiceEventTimelineEvent: TimelineEventMapper = (event, payload) => {
  const direction = normalizeDirection(payload.direction) || 'inbound';

  return {
    ...resolveTimelineBase({
      event,
      payload,
      direction,
      actor: resolveTimelineActor({
        payload,
        fallbackDirection: direction,
      }),
    }),
    type: 'voice_event',
    channel: 'voice',
    body: null,
  };
};

const mapVoicemailTimelineEvent: TimelineEventMapper = (event, payload) => {
  const artifact = resolveVoiceOrVoicemailArtifact(payload);
  const transcription = asRecord(artifact?.transcription);
  const metadata = asRecord(payload.metadata);

  return {
    ...resolveTimelineBase({
      event,
      payload,
      direction: normalizeDirection(payload.direction) || 'inbound',
      actor: resolveTimelineActor({
        payload,
        fallbackDirection: 'inbound',
      }),
    }),
    type: 'voicemail',
    channel: 'voicemail',
    body: null,
    recordingUrl: normalizeString(artifact?.recordingUrl) || null,
    durationSeconds: normalizeDurationSeconds(artifact?.durationSeconds),
    transcript: normalizeString(transcription?.text)
      || normalizeString(metadata?.transcriptText)
      || null,
  };
};

const resolveBridgeSessionVoicemailProjection = (aggregate: {
  session: {
    updatedAt?: Date | string | null;
  };
} | null): {
  artifactId: string;
  recordingUrl: string;
  occurredAtUtc: string;
} | null => {
  if (!aggregate) {
    return null;
  }

  const sessionRecord = asRecord(aggregate.session as unknown);
  const artifactId = normalizeString(sessionRecord?.voicemailArtifactId);
  const recordingUrl = normalizeString(sessionRecord?.voicemailRecordingUrl);
  const recordingStatus = normalizeString(sessionRecord?.voicemailRecordingStatus);
  const occurredAtUtc = toIsoString(aggregate.session.updatedAt) || null;

  if (!artifactId || !recordingUrl || recordingStatus !== 'completed' || !occurredAtUtc) {
    return null;
  }

  return {
    artifactId,
    recordingUrl,
    occurredAtUtc,
  };
};

const canonicalPayloadAlreadyProjectsVoicemail = (input: {
  events: readonly ConnectShyftCanonicalEventRecord[];
  voicemailProjection: {
    artifactId: string;
    recordingUrl: string;
  };
}): boolean => {
  return input.events.some((event) => {
    const payload = asRecord(event.payload);
    const voicemailArtifact = asRecord(payload?.voicemailArtifact);
    const artifactId = normalizeString(voicemailArtifact?.artifactId);
    const recordingUrl = normalizeString(voicemailArtifact?.recordingUrl);

    return artifactId === input.voicemailProjection.artifactId
      || (
        Boolean(recordingUrl)
        && recordingUrl === input.voicemailProjection.recordingUrl
      );
  });
};

const buildBridgeSessionVoicemailTimelineItem = (input: {
  threadId: string;
  voicemailProjection: {
    artifactId: string;
    recordingUrl: string;
    occurredAtUtc: string;
  };
}): ConnectShyftVoicemailTimelineItem => ({
  id: `bridge-voicemail-${input.voicemailProjection.artifactId}`,
  threadId: input.threadId,
  type: 'voicemail',
  direction: 'outbound',
  channel: 'voicemail',
  body: null,
  occurredAtUtc: input.voicemailProjection.occurredAtUtc,
  actor: 'system',
  providerMetadata: null,
  deliveryStatus: null,
  recordingUrl: input.voicemailProjection.recordingUrl,
  durationSeconds: null,
  transcript: null,
});

const CONNECTSHYFT_TIMELINE_MAPPERS = new Map<string, TimelineEventMapper>([
  [CONNECTSHYFT_INBOUND_SMS_APPENDED_EVENT_NAME, mapInboundSmsTimelineEvent],
  [CONNECTSHYFT_OUTBOUND_SMS_APPENDED_EVENT_NAME, mapOutboundSmsTimelineEvent],
  [CONNECTSHYFT_OUTBOUND_SMS_EVENT_NAME_ALIAS, mapOutboundSmsTimelineEvent],
  [CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.started, mapVoiceEventTimelineEvent],
  [CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.connected, mapVoiceEventTimelineEvent],
  [CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.ended, mapVoiceEventTimelineEvent],
  [CONNECTSHYFT_VOICE_TIMELINE_EVENT_NAMES.outboundDispatched, mapVoiceEventTimelineEvent],
  ['CallAttemptStarted', mapVoiceEventTimelineEvent],
  ['CallConnected', mapVoiceEventTimelineEvent],
  [CONNECTSHYFT_INBOUND_VOICE_FALLBACK_EVENT_NAME, mapVoiceEventTimelineEvent],
  [CONNECTSHYFT_INBOUND_VOICE_VOICEMAIL_EVENT_NAME, mapVoicemailTimelineEvent],
  [CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_REQUESTED_EVENT_NAME, mapVoicemailTimelineEvent],
  [CONNECTSHYFT_VOICEMAIL_TRANSCRIPTION_ATTACHED_EVENT_NAME, mapVoicemailTimelineEvent],
]);

const resolveEventKeys = (
  event: ConnectShyftCanonicalEventRecord,
  payload: Record<string, unknown>,
): string[] => {
  const keys = new Set<string>();
  const eventName = normalizeString(payload.eventName);
  const lifecycleEvent = normalizeString(payload.lifecycleEvent);

  if (eventName) {
    keys.add(eventName);
  }
  if (lifecycleEvent) {
    keys.add(lifecycleEvent);
  }
  if (event.eventType) {
    keys.add(event.eventType);
  }

  return [...keys];
};

export const normalizeConnectShyftThreadTimelineLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return CONNECTSHYFT_THREAD_TIMELINE_DEFAULT_LIMIT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return CONNECTSHYFT_THREAD_TIMELINE_DEFAULT_LIMIT;
  }

  return Math.min(normalized, CONNECTSHYFT_THREAD_TIMELINE_MAX_LIMIT);
};

export const mapConnectShyftCanonicalEventToTimelineItem = (
  event: ConnectShyftCanonicalEventRecord,
): ConnectShyftThreadTimelineItem | null => {
  const payload = asRecord(event.payload);
  if (!payload) {
    return null;
  }

  for (const key of resolveEventKeys(event, payload)) {
    const mapper = CONNECTSHYFT_TIMELINE_MAPPERS.get(key);
    if (!mapper) {
      continue;
    }

    const item = mapper(event, payload);
    if (item) {
      return item;
    }
  }

  return null;
};

export const sortConnectShyftThreadTimelineItems = (
  items: readonly ConnectShyftThreadTimelineItem[],
): ConnectShyftThreadTimelineItem[] => {
  return [...items].sort((left, right) => {
    const occurredAtDelta = (
      new Date(left.occurredAtUtc).getTime()
      - new Date(right.occurredAtUtc).getTime()
    );
    if (occurredAtDelta !== 0) {
      return occurredAtDelta;
    }

    return left.id.localeCompare(right.id);
  });
};

export const getThreadTimeline = async (
  input: GetThreadTimelineInput,
): Promise<ConnectShyftThreadTimelineResult> => {
  const threadId = normalizeString(input.threadId);
  const limitApplied = normalizeConnectShyftThreadTimelineLimit(input.limit);
  const events = await listConnectShyftCanonicalEvents({
    tenantId: input.tenantId,
    orgUnitId: input.orgUnitId,
    aggregateId: threadId,
    aggregateType: 'Thread',
    limit: CONNECTSHYFT_THREAD_TIMELINE_MAX_LIMIT,
    window: 'most_recent',
    db: input.db,
  });
  const activeBridgeSession = await loadConnectShyftBridgeAggregateByThreadId({
    tenantId: input.tenantId,
    threadId,
  });
  const voicemailProjection = resolveBridgeSessionVoicemailProjection(activeBridgeSession);

  const items = events
    .map((event) => mapConnectShyftCanonicalEventToTimelineItem(event))
    .filter((item): item is ConnectShyftThreadTimelineItem => item !== null);

  if (
    voicemailProjection
    && !canonicalPayloadAlreadyProjectsVoicemail({
      events,
      voicemailProjection,
    })
  ) {
    items.push(buildBridgeSessionVoicemailTimelineItem({
      threadId,
      voicemailProjection,
    }));
  }

  const sortedItems = sortConnectShyftThreadTimelineItems(items);

  return {
    threadId,
    source: 'canonical_events',
    deterministic: true,
    limitApplied,
    items: sortedItems.slice(-limitApplied),
  };
};
