import type {
  ConnectShyftThreadTimelineItem,
  ConnectShyftThreadTimelineResult,
} from './threadTimeline';

export type ConnectShyftThreadTimelineItemDto = {
  id: string;
  thread_id: string;
  type: 'message' | 'voice_event' | 'voicemail';
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'voice' | 'voicemail';
  body: string | null;
  occurred_at_utc: string;
  actor: 'system' | 'user' | 'neighbor';
  provider_metadata: Record<string, unknown> | null;
  delivery_status: string | null;
  recording_url?: string | null;
  recording_status?: 'pending' | 'completed' | 'failed' | null;
  duration_seconds?: number | null;
  transcript?: string | null;
  transcription_text?: string | null;
  transcription_status?: 'pending' | 'completed' | 'failed' | null;
  seen_at_utc?: string | null;
  reviewed_at_utc?: string | null;
};

export type ConnectShyftThreadTimelineResponseDto = {
  thread_id: string;
  neighbor_deleted: boolean;
  neighbor_deleted_at_utc: string | null;
  deterministic: true;
  limit_applied: number;
  items: ConnectShyftThreadTimelineItemDto[];
};

const serializeConnectShyftThreadTimelineItem = (
  item: ConnectShyftThreadTimelineItem,
): ConnectShyftThreadTimelineItemDto => {
  const base = {
    id: item.id,
    thread_id: item.threadId,
    type: item.type,
    direction: item.direction,
    channel: item.channel,
    body: item.body,
    occurred_at_utc: item.occurredAtUtc,
    actor: item.actor,
    provider_metadata: item.providerMetadata,
    delivery_status: item.deliveryStatus,
  } satisfies ConnectShyftThreadTimelineItemDto;

  if (item.type !== 'voicemail') {
    return base;
  }

  return {
    ...base,
    recording_url: item.recordingUrl,
    recording_status: item.recordingStatus,
    duration_seconds: item.durationSeconds,
    transcript: item.transcript,
    transcription_text: item.transcriptionText,
    transcription_status: item.transcriptionStatus,
    seen_at_utc: item.seenAtUtc,
    reviewed_at_utc: item.reviewedAtUtc,
  };
};

export const serializeConnectShyftThreadTimelineResponse = (input: {
  timeline: ConnectShyftThreadTimelineResult;
  neighborDeleted: boolean;
  neighborDeletedAtUtc: string | null;
}): ConnectShyftThreadTimelineResponseDto => ({
  thread_id: input.timeline.threadId,
  neighbor_deleted: input.neighborDeleted,
  neighbor_deleted_at_utc: input.neighborDeletedAtUtc,
  deterministic: input.timeline.deterministic,
  limit_applied: input.timeline.limitApplied,
  items: input.timeline.items.map(serializeConnectShyftThreadTimelineItem),
});
