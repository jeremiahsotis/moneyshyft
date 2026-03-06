import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import { sanitizeConnectShyftOperatorCopy } from '@/features/connectshyft/uiContracts';

export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';
export type ConnectShyftInboxBucket = 'inbox' | 'mine';

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
  orgUnitId: string;
  state: ConnectShyftThreadState;
  claimedByUserId: string | null;
  bucket: ConnectShyftInboxBucket;
  escalationStage: number;
  priorityRank: number;
  urgencyLabel: string;
  lastActivityAtUtc: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  preferredOutboundContext: {
    csNumberId: string;
    label: string;
  };
  voicemailIndicator: boolean;
  voicemailLabel: string | null;
  summary: string;
  display: {
    title: string;
    urgencyLabel: string;
    stateLabel: string;
    inboundContext: string;
    outboundContext: string;
    neighborContext: string;
    conferenceContext: string;
    voicemailLabel: string;
  };
};

export type ConnectShyftThreadDetail = ConnectShyftThreadSummary & {
  actions: string[];
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
  };

  const threadId = normalizeString(candidate.threadId);
  if (!threadId) {
    return null;
  }

  const preferredOutboundContext = parsePreferredOutboundContext(
    candidate.preferredOutboundContext ?? candidate.preferred_outbound_context,
  );
  const state = normalizeState(candidate.state);
  const urgencyLabel = normalizeString(candidate.urgencyLabel);
  const lastInboundCsNumberId = normalizeString(
    candidate.lastInboundCsNumberId ?? candidate.last_inbound_cs_number_id,
  );
  const preferredOutboundCsNumberId = normalizeString(
    candidate.preferredOutboundCsNumberId ?? candidate.preferred_outbound_cs_number_id,
  );
  const safeSummary = sanitizeConnectShyftOperatorCopy(
    normalizeString(candidate.summary),
    'Conversation in progress.',
  );

  const voicemailIndicator =
    candidate.voicemailIndicator === true || hasVoicemailTimelineEvent(candidate.timeline);
  const explicitVoicemailLabel = normalizeString(
    candidate.voicemailLabel ?? candidate.voicemail_label,
  );
  const voicemailLabel = explicitVoicemailLabel
    || (voicemailIndicator ? (state === 'UNCLAIMED' ? 'Voicemail received' : 'Voicemail') : '');

  const displayStateLabel = state === 'UNCLAIMED'
    ? 'Unclaimed'
    : state === 'CLAIMED'
      ? 'Claimed'
      : 'Closed';
  const displayUrgencyLabel = sanitizeConnectShyftOperatorCopy(
    urgencyLabel,
    state === 'UNCLAIMED' ? 'New conversation' : 'Active follow-up',
  );
  const displayInboundContext = lastInboundCsNumberId
    ? 'cs-number inbound line configured'
    : 'Inbound line unavailable';
  const displayOutboundContext = preferredOutboundContext.label
    ? sanitizeConnectShyftOperatorCopy(
      preferredOutboundContext.label,
      'cs-number outbound line configured',
    )
    : preferredOutboundCsNumberId
      ? 'cs-number outbound line configured'
      : 'Outbound line unavailable';
  const displayVoicemailLabel = voicemailIndicator
    ? sanitizeConnectShyftOperatorCopy(voicemailLabel, 'Voicemail waiting for review')
    : '';

  return {
    threadId,
    orgUnitId: normalizeString(candidate.orgUnitId),
    state,
    claimedByUserId: normalizeString(
      candidate.claimedByUserId ?? candidate.claimed_by_user_id,
    ) || null,
    bucket: normalizeBucket(candidate.bucket),
    escalationStage: normalizeStage(candidate.escalationStage),
    priorityRank: normalizePriorityRank(candidate.priorityRank),
    urgencyLabel,
    lastActivityAtUtc: normalizeString(candidate.lastActivityAtUtc),
    lastInboundCsNumberId,
    preferredOutboundCsNumberId,
    preferredOutboundContext,
    voicemailIndicator,
    voicemailLabel: voicemailLabel || null,
    summary: safeSummary,
    display: {
      title: safeSummary,
      urgencyLabel: displayUrgencyLabel,
      stateLabel: displayStateLabel,
      inboundContext: displayInboundContext,
      outboundContext: displayOutboundContext,
      neighborContext: `Neighbor context: ${safeSummary}`,
      conferenceContext: `Conference context: ${displayOutboundContext}`,
      voicemailLabel: displayVoicemailLabel,
    },
  };
};

const parseThreadDetail = (payload: unknown): ConnectShyftThreadDetail | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const summary = parseThreadSummary(payload);
  if (!summary) {
    return null;
  }

  const candidate = payload as {
    actions?: unknown;
    lifecycle?: {
      reopenedByInbound?: unknown;
    };
  };

  const actions = Array.isArray(candidate.actions)
    ? candidate.actions
      .map((entry) => normalizeString(entry))
      .filter((entry) => entry.length > 0)
    : [];

  return {
    ...summary,
    actions,
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

    const thread = parseThreadDetail(envelope.data?.thread);
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
