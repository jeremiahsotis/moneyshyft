import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import type {
  ConnectShyftThreadSubjectImpact,
  SubjectContext,
} from '@shyft/contracts';
import {
  isConnectShyftResolverQueueItemType,
  isConnectShyftThreadSubjectImpactType,
  validateSubjectContext,
} from '@shyft/contracts';

export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';
export type ConnectShyftInboxBucket = 'inbox' | 'mine';
export type ConnectShyftThreadIdentityState = 'confirmed' | 'provisional';
export type ConnectShyftTimelineEventDirection = 'inbound' | 'outbound' | 'system';

export type ConnectShyftInboxActions = {
  claim: boolean;
  takeover: boolean;
};

export type ConnectShyftInboxContext = {
  tenantId: string;
  orgUnitId: string;
  bypassedOrgUnitMembership: boolean;
};

export type ConnectShyftThreadSummary = {
  threadId: string;
  neighborId: string | null;
  orgUnitId: string;
  state: ConnectShyftThreadState;
  stateLabel: string;
  claimedByUserId: string | null;
  bucket: ConnectShyftInboxBucket;
  escalationStage: number;
  priorityRank: number;
  urgencyLabel: string;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  lastInboundContext: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundContextLabel: string;
  neighborContextLabel: string;
  conferenceContextLabel: string;
  claimContextLabel: string;
  preferredOutboundContext: {
    csNumberId: string;
    label: string;
  };
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
  summary: string;
  preview: string;
};

export type ConnectShyftTimelineEvent = {
  eventId: string;
  eventName: string;
  summary: string;
  conversationType: string;
  direction?: ConnectShyftTimelineEventDirection;
  occurredAtUtc?: string | null;
  channel?: string | null;
  body?: string | null;
  recordingUrl?: string | null;
  recordingStatus?: string | null;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
  transcriptionStatus?: string | null;
  voicemailArtifactId?: string | null;
};

export type ConnectShyftThreadDetail = ConnectShyftThreadSummary & {
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
  subjectImpact: ConnectShyftThreadSubjectImpact | null;
  subjectContext: SubjectContext;
  actions: string[];
  timeline: ConnectShyftTimelineEvent[];
  lifecycle: {
    reopenedByInbound: boolean;
  };
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    items?: unknown[];
    thread?: unknown;
    voicemailArtifacts?: unknown;
    context?: {
      tenantId?: unknown;
      orgUnitId?: unknown;
      bypassedOrgUnitMembership?: unknown;
    };
    actions?: {
      claim?: boolean;
      takeover?: boolean;
    };
  };
};

export type ConnectShyftBucketReadResult =
  | {
    ok: true;
    code: string;
    message: string;
    items: ConnectShyftThreadSummary[];
    actions: ConnectShyftInboxActions;
    context: ConnectShyftInboxContext | null;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

export type ConnectShyftThreadDetailResult =
  | {
    ok: true;
    code: string;
    message: string;
    thread: ConnectShyftThreadDetail;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeStage = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 0;
};

const normalizePriorityRank = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return 5;
};

const normalizeBucket = (value: unknown): ConnectShyftInboxBucket => {
  if (value === 'mine') {
    return 'mine';
  }

  return 'inbox';
};

const normalizeState = (value: unknown): ConnectShyftThreadState => {
  if (value === 'UNCLAIMED' || value === 'CLAIMED' || value === 'CLOSED') {
    return value;
  }

  return 'UNCLAIMED';
};

const normalizeIdentityState = (value: unknown): ConnectShyftThreadIdentityState | null => {
  if (value === 'confirmed' || value === 'provisional') {
    return value;
  }

  return null;
};

const parsePreferredOutboundContext = (
  payload: unknown,
): { csNumberId: string; label: string } => {
  if (!payload || typeof payload !== 'object') {
    return { csNumberId: '', label: '' };
  }

  const candidate = payload as {
    csNumberId?: unknown;
    cs_number_id?: unknown;
    label?: unknown;
  };

  return {
    csNumberId: normalizeString(candidate.csNumberId ?? candidate.cs_number_id),
    label: normalizeString(candidate.label),
  };
};

const parseDisplayRecord = (
  payload: unknown,
): {
  title: string;
  preview: string;
  urgencyLabel: string;
  stateLabel: string;
  inboundContext: string;
  outboundContext: string;
  neighborContext: string;
  conferenceContext: string;
  claimContext: string;
  voicemailLabel: string;
} => {
  if (!payload || typeof payload !== 'object') {
    return {
      title: '',
      preview: '',
      urgencyLabel: '',
      stateLabel: '',
      inboundContext: '',
      outboundContext: '',
      neighborContext: '',
      conferenceContext: '',
      claimContext: '',
      voicemailLabel: '',
    };
  }

  const candidate = payload as {
    title?: unknown;
    preview?: unknown;
    urgencyLabel?: unknown;
    stateLabel?: unknown;
    inboundContext?: unknown;
    outboundContext?: unknown;
    neighborContext?: unknown;
    conferenceContext?: unknown;
    claimContext?: unknown;
    voicemailLabel?: unknown;
  };

  return {
    title: normalizeString(candidate.title),
    preview: normalizeString(candidate.preview),
    urgencyLabel: normalizeString(candidate.urgencyLabel),
    stateLabel: normalizeString(candidate.stateLabel),
    inboundContext: normalizeString(candidate.inboundContext),
    outboundContext: normalizeString(candidate.outboundContext),
    neighborContext: normalizeString(candidate.neighborContext),
    conferenceContext: normalizeString(candidate.conferenceContext),
    claimContext: normalizeString(candidate.claimContext),
    voicemailLabel: normalizeString(candidate.voicemailLabel),
  };
};

const parseTimelineEvents = (payload: unknown): ConnectShyftTimelineEvent[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map<ConnectShyftTimelineEvent | null>((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const candidate = entry as {
        eventId?: unknown;
        eventName?: unknown;
        eventType?: unknown;
        occurredAtUtc?: unknown;
        occurred_at_utc?: unknown;
        direction?: unknown;
        actor?: unknown;
        metadata?: unknown;
        conversationType?: unknown;
        payload?: unknown;
        summary?: unknown;
      };
      const payloadRecord = asRecord(candidate.payload);
      const metadata = asRecord(candidate.metadata) ?? asRecord(payloadRecord?.metadata);
      const inboundMessageArtifact = asRecord(payloadRecord?.inboundMessageArtifact);
      const outboundMessageArtifact = asRecord(payloadRecord?.outboundMessageArtifact);
      const voicemailArtifact = asRecord(payloadRecord?.voicemailArtifact);
      const transcription = asRecord(voicemailArtifact?.transcription)
        ?? asRecord(payloadRecord?.transcription);

      const eventId = normalizeString(candidate.eventId);
      const eventName = normalizeString(candidate.eventName ?? candidate.eventType);
      const summary = normalizeString(payloadRecord?.summary ?? candidate.summary);
      const conversationType = normalizeString(candidate.conversationType)
        || (eventName.toLowerCase().includes('voicemail') ? 'voicemail' : 'message');
      const actor = normalizeString(payloadRecord?.actor ?? candidate.actor).toLowerCase();
      const rawDirection = normalizeString(payloadRecord?.direction ?? candidate.direction).toLowerCase();
      const direction: ConnectShyftTimelineEventDirection = rawDirection === 'inbound'
        ? 'inbound'
        : rawDirection === 'outbound'
          ? 'outbound'
          : actor === 'neighbor'
            ? 'inbound'
            : actor === 'user'
              ? 'outbound'
              : 'system';
      const body = normalizeOptionalString(
        inboundMessageArtifact?.body
        ?? outboundMessageArtifact?.body
        ?? payloadRecord?.body
        ?? payloadRecord?.message,
      );
      const recordingUrl = normalizeOptionalString(
        voicemailArtifact?.recordingUrl
        ?? voicemailArtifact?.recording_url
        ?? payloadRecord?.recordingUrl
        ?? payloadRecord?.recording_url,
      );
      const transcriptionText = normalizeOptionalString(
        transcription?.text
        ?? transcription?.transcriptText
        ?? transcription?.transcriptionText
        ?? transcription?.transcript_text
        ?? transcription?.transcription_text
        ?? metadata?.transcript
        ?? metadata?.transcriptText
        ?? metadata?.transcriptionText
        ?? metadata?.transcript_text
        ?? metadata?.transcription_text,
      );
      const transcriptionStatus = normalizeOptionalString(
        transcription?.status
        ?? transcription?.transcriptionStatus
        ?? transcription?.transcription_status
        ?? metadata?.transcriptionStatus
        ?? metadata?.transcription_status,
      );
      const voicemailArtifactId = normalizeOptionalString(
        voicemailArtifact?.artifactId
        ?? voicemailArtifact?.artifact_id
        ?? payloadRecord?.voicemailArtifactId
        ?? payloadRecord?.voicemail_artifact_id
        ?? metadata?.voicemailArtifactId
        ?? metadata?.voicemail_artifact_id,
      );
      const fallbackSummary = conversationType === 'voicemail'
        ? 'Voicemail received.'
        : body || 'Conversation activity recorded.';

      if (!eventId && !eventName) {
        return null;
      }

      const normalizedEvent: ConnectShyftTimelineEvent = {
        eventId: eventId || eventName,
        eventName: eventName || 'connectshyft.timeline.event',
        summary: summary || fallbackSummary,
        conversationType,
        direction,
        occurredAtUtc: normalizeOptionalString(candidate.occurredAtUtc ?? candidate.occurred_at_utc),
        channel: normalizeOptionalString(payloadRecord?.channel),
        body,
        recordingUrl,
        recordingStatus: normalizeOptionalString(
          voicemailArtifact?.recordingStatus
          ?? voicemailArtifact?.recording_status
          ?? payloadRecord?.recordingStatus
          ?? payloadRecord?.recording_status,
        ),
        durationSeconds: normalizeOptionalNumber(
          voicemailArtifact?.durationSeconds
          ?? voicemailArtifact?.duration_seconds
          ?? payloadRecord?.durationSeconds
          ?? payloadRecord?.duration_seconds,
        ),
        transcriptionText,
        transcriptionStatus,
        voicemailArtifactId,
      };

      return normalizedEvent;
    })
    .filter((event): event is ConnectShyftTimelineEvent => event !== null);
};

const parseVoicemailArtifactTranscripts = (payload: unknown): Map<string, string> => {
  if (!Array.isArray(payload)) {
    return new Map();
  }

  return payload.reduce<Map<string, string>>((artifacts, entry) => {
    const candidate = asRecord(entry);
    const artifactId = normalizeString(candidate?.artifactId);
    const transcription = asRecord(candidate?.transcription);
    const transcriptionText = normalizeString(transcription?.text);
    if (!artifactId || !transcriptionText) {
      return artifacts;
    }

    artifacts.set(artifactId, transcriptionText);
    return artifacts;
  }, new Map());
};

const buildFallbackSubjectContext = (input: {
  orgUnitId: string;
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
  threadId: string;
}): SubjectContext => {
  const baseSubject: SubjectContext = {
    orgUnitId: input.orgUnitId,
    threadId: input.threadId,
  };

  if (!input.personId) {
    return baseSubject;
  }

  if (input.identityState === 'provisional') {
    return {
      ...baseSubject,
      provisionalPersonId: input.personId,
      identityState: 'provisional',
    };
  }

  return {
    ...baseSubject,
    personId: input.personId,
    identityState: 'confirmed',
  };
};

const parseSubjectContext = (input: {
  payload: unknown;
  orgUnitId: string;
  personId: string | null;
  identityState: ConnectShyftThreadIdentityState | null;
  threadId: string;
}): SubjectContext => {
  if (!input.payload || typeof input.payload !== 'object') {
    return buildFallbackSubjectContext(input);
  }

  const candidate = input.payload as {
    orgUnitId?: unknown;
    personId?: unknown;
    provisionalPersonId?: unknown;
    candidatePersonIds?: unknown;
    candidate_person_ids?: unknown;
    conversationId?: unknown;
    contactPointId?: unknown;
    threadId?: unknown;
    thread_id?: unknown;
    identityState?: unknown;
    identity_state?: unknown;
  };

  const orgUnitId = normalizeString(candidate.orgUnitId) || input.orgUnitId;
  const personId = normalizeString(candidate.personId);
  const provisionalPersonId = normalizeString(candidate.provisionalPersonId);
  const candidatePersonIds = normalizeStringArray(
    candidate.candidatePersonIds ?? candidate.candidate_person_ids,
  );
  const conversationId = normalizeString(candidate.conversationId);
  const contactPointId = normalizeString(candidate.contactPointId);
  const threadId = normalizeString(candidate.threadId ?? candidate.thread_id) || input.threadId;
  const identityStateCandidate = normalizeIdentityState(
    candidate.identityState ?? candidate.identity_state,
  );

  const fallback = buildFallbackSubjectContext({
    orgUnitId,
    personId: input.personId,
    identityState: input.identityState,
    threadId,
  });
  const subject: SubjectContext = {
    ...fallback,
    candidatePersonIds: candidatePersonIds.length > 0 ? candidatePersonIds : fallback.candidatePersonIds,
    conversationId: conversationId || undefined,
    contactPointId: contactPointId || undefined,
    threadId,
    identityState: identityStateCandidate ?? fallback.identityState,
  };

  if (personId && !provisionalPersonId) {
    delete subject.provisionalPersonId;
    subject.personId = personId;
    subject.identityState = identityStateCandidate === 'provisional'
      ? 'confirmed'
      : identityStateCandidate || 'confirmed';
  } else if (provisionalPersonId && !personId) {
    delete subject.personId;
    subject.provisionalPersonId = provisionalPersonId;
    subject.identityState = identityStateCandidate === 'confirmed'
      ? 'provisional'
      : identityStateCandidate || 'provisional';
  }

  validateSubjectContext(subject);
  return subject;
};

const hasVoicemailTimelineEvent = (payload: unknown): boolean => {
  if (!Array.isArray(payload)) {
    return false;
  }

  return payload.some((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const candidate = entry as {
      eventName?: unknown;
      event_name?: unknown;
      type?: unknown;
    };
    const eventName = normalizeString(
      candidate.eventName ?? candidate.event_name ?? candidate.type,
    ).toLowerCase();
    return eventName.includes('voicemail');
  });
};

const parseThreadSummary = (payload: unknown): ConnectShyftThreadSummary | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    threadId?: unknown;
    neighborId?: unknown;
    neighbor_id?: unknown;
    orgUnitId?: unknown;
    state?: unknown;
    claimedByUserId?: unknown;
    claimed_by_user_id?: unknown;
    bucket?: unknown;
    escalationStage?: unknown;
    priorityRank?: unknown;
    urgencyLabel?: unknown;
    lastActivityAtUtc?: unknown;
    lastInboundCsNumberId?: unknown;
    last_inbound_cs_number_id?: unknown;
    preferredOutboundCsNumberId?: unknown;
    preferred_outbound_cs_number_id?: unknown;
    preferredOutboundContext?: unknown;
    preferred_outbound_context?: unknown;
    voicemailIndicator?: unknown;
    voicemailLabel?: unknown;
    voicemail_label?: unknown;
    timeline?: unknown;
    summary?: unknown;
    preview?: unknown;
    display?: unknown;
  };

  const threadId = normalizeString(candidate.threadId);
  if (!threadId) {
    return null;
  }

  const preferredOutboundContext = parsePreferredOutboundContext(
    candidate.preferredOutboundContext ?? candidate.preferred_outbound_context,
  );
  const display = parseDisplayRecord(candidate.display);
  const summary = display.title || normalizeString(candidate.summary);
  const preview = display.preview || summary;
  const state = normalizeState(candidate.state);

  const voicemailIndicator =
    candidate.voicemailIndicator === true || hasVoicemailTimelineEvent(candidate.timeline);
  const explicitVoicemailLabel = normalizeString(
    candidate.voicemailLabel ?? candidate.voicemail_label,
  );
  const voicemailLabel = explicitVoicemailLabel
    || display.voicemailLabel
    || (voicemailIndicator
      ? (normalizeState(candidate.state) === 'UNCLAIMED' ? 'Voicemail received' : 'Voicemail')
      : '');
  const conferenceContextLabel = display.conferenceContext
    || `Conference context: ${display.outboundContext || preferredOutboundContext.label || preferredOutboundContext.csNumberId || 'Unassigned outbound conference line'}`;
  const summaryText = summary || 'Active thread';

  return {
    threadId,
    neighborId: normalizeString(candidate.neighborId ?? candidate.neighbor_id) || null,
    orgUnitId: normalizeString(candidate.orgUnitId),
    state,
    stateLabel: display.stateLabel || state,
    claimedByUserId: normalizeString(
      candidate.claimedByUserId ?? candidate.claimed_by_user_id,
    ) || null,
    bucket: normalizeBucket(candidate.bucket),
    escalationStage: normalizeStage(candidate.escalationStage),
    priorityRank: normalizePriorityRank(candidate.priorityRank),
    urgencyLabel: display.urgencyLabel || normalizeString(candidate.urgencyLabel),
    lastActivityAtUtc: normalizeString(candidate.lastActivityAtUtc),
    lastInboundCsNumberId: normalizeString(
      candidate.lastInboundCsNumberId ?? candidate.last_inbound_cs_number_id,
    ),
    lastInboundContext: display.inboundContext,
    preferredOutboundCsNumberId: normalizeString(
      candidate.preferredOutboundCsNumberId ?? candidate.preferred_outbound_cs_number_id,
    ),
    preferredOutboundContextLabel: display.outboundContext || preferredOutboundContext.label,
    neighborContextLabel: display.neighborContext || `Neighbor context: ${summaryText}`,
    conferenceContextLabel,
    claimContextLabel: display.claimContext || `Claim context: ${display.stateLabel || state}`,
    preferredOutboundContext,
    voicemailIndicator,
    voicemailLabel: voicemailLabel || null,
    summary,
    preview,
  };
};

const parseThreadSubjectImpact = (payload: unknown): ConnectShyftThreadSubjectImpact | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    impactType?: unknown;
    impact_type?: unknown;
    actionable?: unknown;
    resolverQueueItemId?: unknown;
    resolver_queue_item_id?: unknown;
    resolverQueueItemType?: unknown;
    resolver_queue_item_type?: unknown;
  };

  const impactType = candidate.impactType ?? candidate.impact_type;
  const resolverQueueItemType =
    candidate.resolverQueueItemType ?? candidate.resolver_queue_item_type;

  if (!isConnectShyftThreadSubjectImpactType(impactType)) {
    return null;
  }

  return {
    impactType,
    actionable: candidate.actionable === true,
    resolverQueueItemId: normalizeOptionalString(
      candidate.resolverQueueItemId ?? candidate.resolver_queue_item_id,
    ),
    resolverQueueItemType: isConnectShyftResolverQueueItemType(resolverQueueItemType)
      ? resolverQueueItemType
      : null,
  };
};

const parseThreadDetail = (
  payload: unknown,
  voicemailArtifactTranscripts: Map<string, string>,
): ConnectShyftThreadDetail | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const summary = parseThreadSummary(payload);
  if (!summary) {
    return null;
  }

  const candidate = payload as {
    actions?: unknown;
    personId?: unknown;
    identityState?: unknown;
    subjectImpact?: unknown;
    subjectContext?: unknown;
    timeline?: unknown;
    lifecycle?: {
      reopenedByInbound?: unknown;
    };
  };

  const actions = Array.isArray(candidate.actions)
    ? candidate.actions
      .map((entry) => normalizeString(entry))
      .filter((entry) => entry.length > 0)
    : [];
  const parsedIdentityState = normalizeIdentityState(candidate.identityState);
  const fallbackPersonId = normalizeString(candidate.personId) || null;
  const subjectContext = parseSubjectContext({
    payload: candidate.subjectContext,
    orgUnitId: summary.orgUnitId,
    personId: fallbackPersonId,
    identityState: parsedIdentityState,
    threadId: summary.threadId,
  });
  const personId = fallbackPersonId
    || subjectContext.personId
    || subjectContext.provisionalPersonId
    || null;
  const identityState = parsedIdentityState
    || subjectContext.identityState
    || (subjectContext.provisionalPersonId
      ? 'provisional'
      : personId
        ? 'confirmed'
        : null);
  const timeline = parseTimelineEvents(candidate.timeline).map((event) => {
    if (!event.voicemailArtifactId) {
      return event;
    }

    const enrichedTranscript = voicemailArtifactTranscripts.get(event.voicemailArtifactId);
    if (!enrichedTranscript || event.transcriptionText) {
      return event;
    }

    return {
      ...event,
      transcriptionText: enrichedTranscript,
      transcriptionStatus: event.transcriptionStatus || 'completed',
    };
  });

  return {
    ...summary,
    personId,
    identityState,
    subjectImpact: parseThreadSubjectImpact(candidate.subjectImpact),
    subjectContext,
    actions,
    timeline,
    lifecycle: {
      reopenedByInbound: candidate.lifecycle?.reopenedByInbound === true,
    },
  };
};

const parseEnvelopeMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const message = normalizeString(envelope.message);
  return message || fallback;
};

const parseBucketItems = (payload: unknown): ConnectShyftThreadSummary[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEnvelope;
  if (!Array.isArray(envelope.data?.items)) {
    return [];
  }

  return envelope.data.items
    .map(parseThreadSummary)
    .filter((entry): entry is ConnectShyftThreadSummary => entry !== null);
};

const parseBucketActions = (payload: unknown): ConnectShyftInboxActions => {
  if (!payload || typeof payload !== 'object') {
    return {
      claim: false,
      takeover: false,
    };
  }

  const envelope = payload as ConnectShyftEnvelope;
  return {
    claim: envelope.data?.actions?.claim === true,
    takeover: envelope.data?.actions?.takeover === true,
  };
};

const parseInboxContext = (payload: unknown): ConnectShyftInboxContext | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const context = envelope.data?.context;
  if (!context || typeof context !== 'object') {
    return null;
  }

  const tenantId = normalizeString(context.tenantId);
  const orgUnitId = normalizeString(context.orgUnitId);
  if (!tenantId || !orgUnitId) {
    return null;
  }

  return {
    tenantId,
    orgUnitId,
    bypassedOrgUnitMembership: context.bypassedOrgUnitMembership === true,
  };
};

export const fetchConnectShyftThreadBucket = async (
  bucket: ConnectShyftInboxBucket,
): Promise<ConnectShyftBucketReadResult> => {
  try {
    const response = await api.get('/connectshyft/inbox', {
      params: { bucket },
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: normalizeString(envelope?.code) || 'CONNECTSHYFT_INBOX_READ_REFUSED',
        message: parseEnvelopeMessage(response.data, 'Unable to load ConnectShyft threads.'),
      };
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_INBOX_LISTED',
      message: parseEnvelopeMessage(response.data, 'ConnectShyft threads loaded'),
      items: parseBucketItems(response.data),
      actions: parseBucketActions(response.data),
      context: parseInboxContext(response.data),
    };
  } catch (error: unknown) {
    const payload = (error as { response?: { data?: unknown } })?.response?.data;
    return {
      ok: false,
      code: 'CONNECTSHYFT_INBOX_READ_FAILED',
      message: parseEnvelopeMessage(payload, 'Unable to load ConnectShyft threads.'),
    };
  }
};

export const fetchConnectShyftThreadDetail = async (
  threadId: string,
): Promise<ConnectShyftThreadDetailResult> => {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'Thread id is required.',
    };
  }

  try {
    const response = await api.get(`/connectshyft/threads/${encodeURIComponent(normalizedThreadId)}`, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: normalizeString(envelope?.code) || 'CONNECTSHYFT_THREAD_DETAIL_REFUSED',
        message: parseEnvelopeMessage(response.data, 'Unable to load thread detail.'),
      };
    }

    const thread = parseThreadDetail(
      envelope.data?.thread,
      parseVoicemailArtifactTranscripts(envelope.data?.voicemailArtifacts),
    );
    if (!thread) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_THREAD_DETAIL_INVALID',
        message: 'Thread detail payload was incomplete.',
      };
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
      message: parseEnvelopeMessage(response.data, 'Thread detail loaded'),
      thread,
    };
  } catch (error: unknown) {
    const payload = (error as { response?: { data?: unknown } })?.response?.data;
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_DETAIL_REQUEST_FAILED',
      message: parseEnvelopeMessage(payload, 'Unable to load thread detail.'),
    };
  }
};
