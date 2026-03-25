import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import type {
  ConnectShyftRebindReviewContext,
  ConnectShyftResolverQueueDetailData,
  ConnectShyftResolverQueueItemRecord,
  ConnectShyftResolverQueueItemType,
  ConnectShyftResolverReviewRecord,
  ResolverReviewStatus,
  SubjectContext,
} from '@shyft/contracts';
import {
  isConnectShyftRebindReviewAffectedObjectType,
  isConnectShyftResolverQueueClaimState,
  isConnectShyftResolverQueueItemType,
  isResolverReviewStatus,
  validateSubjectContext,
} from '@shyft/contracts';

type ResolverQueueEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    items?: unknown[];
    item?: unknown;
    review?: unknown;
    rebindReview?: unknown;
    subjectContext?: unknown;
  };
};

export type ConnectShyftResolverQueueListResult =
  | {
    ok: true;
    code: string;
    message: string;
    items: ConnectShyftResolverQueueItemRecord[];
  }
  | {
    ok: false;
    code: string;
    message: string;
    unauthorized: boolean;
  };

export type ConnectShyftResolverQueueDetailResult =
  | {
    ok: true;
    code: string;
    message: string;
    detail: ConnectShyftResolverQueueDetailData;
  }
  | {
    ok: false;
    code: string;
    message: string;
    unauthorized: boolean;
    unavailable: boolean;
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

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

const normalizeSubjectIdentityState = (
  value: unknown,
): SubjectContext['identityState'] | undefined => {
  const normalized = normalizeOptionalString(value);
  return normalized === 'confirmed' || normalized === 'provisional'
    ? normalized
    : undefined;
};

const parseEnvelopeMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const envelope = payload as ResolverQueueEnvelope;
  return normalizeString(envelope.message) || fallback;
};

const isUnauthorizedQueueCode = (code: string): boolean => (
  code.includes('FORBIDDEN') || code.includes('UNAUTHORIZED')
);

const isUnavailableQueueCode = (code: string): boolean => (
  code.includes('NOT_FOUND') || code.includes('UNAVAILABLE')
);

const parseResolverQueueItem = (payload: unknown): ConnectShyftResolverQueueItemRecord | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const id = normalizeString(candidate.id);
  const itemType = candidate.itemType ?? candidate.item_type;
  const status = normalizeString(candidate.status);

  if (!id || !isConnectShyftResolverQueueItemType(itemType) || !isResolverReviewStatus(status)) {
    return null;
  }

  const claimState = candidate.claimState ?? candidate.claim_state;

  return {
    id,
    itemType,
    status: status as ResolverReviewStatus,
    active: candidate.active === true,
    terminal: candidate.terminal === true,
    claimState: isConnectShyftResolverQueueClaimState(claimState) ? claimState : 'unclaimed',
    claimantUserId: normalizeOptionalString(candidate.claimantUserId ?? candidate.claimant_user_id),
    claimedByCurrentUser: candidate.claimedByCurrentUser === true
      || candidate.claimed_by_current_user === true,
    claimable: candidate.claimable === true,
    releasable: candidate.releasable === true,
    actionable: candidate.actionable === true,
    resolverReviewId: normalizeOptionalString(candidate.resolverReviewId ?? candidate.resolver_review_id),
    orgUnitId: normalizeOptionalString(candidate.orgUnitId ?? candidate.org_unit_id),
    conversationId: normalizeOptionalString(candidate.conversationId ?? candidate.conversation_id),
    contactPointId: normalizeOptionalString(candidate.contactPointId ?? candidate.contact_point_id),
    threadId: normalizeOptionalString(candidate.threadId ?? candidate.thread_id),
    personIds: normalizeStringArray(candidate.personIds ?? candidate.person_ids),
    triggerSourceType: normalizeOptionalString(candidate.triggerSourceType ?? candidate.trigger_source_type),
    triggerSourceId: normalizeOptionalString(candidate.triggerSourceId ?? candidate.trigger_source_id),
    requestedAt: normalizeOptionalString(candidate.requestedAt ?? candidate.requested_at),
    startedAt: normalizeOptionalString(candidate.startedAt ?? candidate.started_at),
    resolvedAt: normalizeOptionalString(candidate.resolvedAt ?? candidate.resolved_at),
  };
};

const parseResolverReviewRecord = (payload: unknown): ConnectShyftResolverReviewRecord | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const id = normalizeString(candidate.id);
  const reviewStatus = normalizeString(candidate.reviewStatus ?? candidate.review_status);
  if (!id || !isResolverReviewStatus(reviewStatus)) {
    return null;
  }

  return {
    id,
    tenantId: normalizeString(candidate.tenantId ?? candidate.tenant_id),
    orgUnitId: normalizeString(candidate.orgUnitId ?? candidate.org_unit_id),
    reviewType: normalizeString(candidate.reviewType ?? candidate.review_type) as ConnectShyftResolverReviewRecord['reviewType'],
    reviewStatus: reviewStatus as ResolverReviewStatus,
    priority: (normalizeString(candidate.priority) || 'normal') as ConnectShyftResolverReviewRecord['priority'],
    triggerSourceType: normalizeString(candidate.triggerSourceType ?? candidate.trigger_source_type),
    triggerSourceId: normalizeString(candidate.triggerSourceId ?? candidate.trigger_source_id),
    conversationId: normalizeOptionalString(candidate.conversationId ?? candidate.conversation_id) ?? undefined,
    provisionalPersonId: normalizeOptionalString(candidate.provisionalPersonId ?? candidate.provisional_person_id) ?? undefined,
    candidatePersonIds: normalizeStringArray(candidate.candidatePersonIds ?? candidate.candidate_person_ids),
    contactPointId: normalizeOptionalString(candidate.contactPointId ?? candidate.contact_point_id) ?? undefined,
    confidenceBand: (normalizeString(candidate.confidenceBand ?? candidate.confidence_band) || 'low') as ConnectShyftResolverReviewRecord['confidenceBand'],
    confidenceReasons: normalizeStringArray(candidate.confidenceReasons ?? candidate.confidence_reasons),
    riskFlags: normalizeStringArray(candidate.riskFlags ?? candidate.risk_flags) as ConnectShyftResolverReviewRecord['riskFlags'],
    requestedByUserId: normalizeString(candidate.requestedByUserId ?? candidate.requested_by_user_id),
    assignedResolverUserId: normalizeOptionalString(candidate.assignedResolverUserId ?? candidate.assigned_resolver_user_id) ?? undefined,
    requestedAt: normalizeString(candidate.requestedAt ?? candidate.requested_at),
    startedAt: normalizeOptionalString(candidate.startedAt ?? candidate.started_at) ?? undefined,
    resolvedAt: normalizeOptionalString(candidate.resolvedAt ?? candidate.resolved_at) ?? undefined,
    resolutionType: normalizeOptionalString(candidate.resolutionType ?? candidate.resolution_type) as ConnectShyftResolverReviewRecord['resolutionType'] ?? undefined,
    resolutionReason: normalizeOptionalString(candidate.resolutionReason ?? candidate.resolution_reason) ?? undefined,
    resolutionNotes: normalizeOptionalString(candidate.resolutionNotes ?? candidate.resolution_notes) ?? undefined,
    actionable: candidate.actionable === true,
    terminal: candidate.terminal === true,
    decisionStatus: normalizeOptionalString(candidate.decisionStatus ?? candidate.decision_status) as ConnectShyftResolverReviewRecord['decisionStatus'] ?? null,
  };
};

const parseRebindReviewContext = (payload: unknown): ConnectShyftRebindReviewContext | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const rebindHistoryId = normalizeString(candidate.rebindHistoryId ?? candidate.rebind_history_id);
  const affectedObjectType = candidate.affectedObjectType ?? candidate.affected_object_type;

  if (!rebindHistoryId || !isConnectShyftRebindReviewAffectedObjectType(affectedObjectType)) {
    return null;
  }

  return {
    rebindHistoryId,
    affectedObjectType,
    affectedObjectIds: normalizeStringArray(candidate.affectedObjectIds ?? candidate.affected_object_ids),
    sourcePersonId: normalizeString(candidate.sourcePersonId ?? candidate.source_person_id),
    targetPersonId: normalizeString(candidate.targetPersonId ?? candidate.target_person_id),
    contactPointIds: normalizeStringArray(candidate.contactPointIds ?? candidate.contact_point_ids),
    originatingResolverReviewId: normalizeOptionalString(
      candidate.originatingResolverReviewId ?? candidate.originating_resolver_review_id,
    ),
    originatingResolutionType: normalizeOptionalString(
      candidate.originatingResolutionType ?? candidate.originating_resolution_type,
    ) as ConnectShyftRebindReviewContext['originatingResolutionType'],
  };
};

const parseSubjectContext = (payload: unknown): SubjectContext | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const orgUnitId = normalizeString(candidate.orgUnitId);
  if (!orgUnitId) {
    return null;
  }

  const subjectContext: SubjectContext = {
    orgUnitId,
    personId: normalizeOptionalString(candidate.personId) ?? undefined,
    provisionalPersonId: normalizeOptionalString(candidate.provisionalPersonId) ?? undefined,
    candidatePersonIds: normalizeStringArray(candidate.candidatePersonIds ?? candidate.candidate_person_ids),
    conversationId: normalizeOptionalString(candidate.conversationId ?? candidate.conversation_id) ?? undefined,
    contactPointId: normalizeOptionalString(candidate.contactPointId ?? candidate.contact_point_id) ?? undefined,
    threadId: normalizeOptionalString(candidate.threadId ?? candidate.thread_id) ?? undefined,
    identityState: normalizeSubjectIdentityState(candidate.identityState ?? candidate.identity_state),
  };

  if (!subjectContext.candidatePersonIds?.length) {
    delete subjectContext.candidatePersonIds;
  }

  validateSubjectContext(subjectContext);
  return subjectContext;
};

const parseResolverQueueDetail = (payload: unknown): ConnectShyftResolverQueueDetailData | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const envelope = payload as ResolverQueueEnvelope;
  const item = parseResolverQueueItem(envelope.data?.item);
  if (!item) {
    return null;
  }

  const subjectContext = parseSubjectContext(envelope.data?.subjectContext);
  if (!subjectContext) {
    return null;
  }

  return {
    item,
    review: parseResolverReviewRecord(envelope.data?.review),
    rebindReview: parseRebindReviewContext(envelope.data?.rebindReview),
    subjectContext,
  };
};

const buildListFailure = (payload: unknown, fallbackCode: string, fallbackMessage: string): ConnectShyftResolverQueueListResult => {
  const envelope = payload as ResolverQueueEnvelope | undefined;
  const code = normalizeString(envelope?.code) || fallbackCode;
  return {
    ok: false,
    code,
    message: parseEnvelopeMessage(payload, fallbackMessage),
    unauthorized: isUnauthorizedQueueCode(code),
  };
};

const buildDetailFailure = (payload: unknown, fallbackCode: string, fallbackMessage: string): ConnectShyftResolverQueueDetailResult => {
  const envelope = payload as ResolverQueueEnvelope | undefined;
  const code = normalizeString(envelope?.code) || fallbackCode;
  return {
    ok: false,
    code,
    message: parseEnvelopeMessage(payload, fallbackMessage),
    unauthorized: isUnauthorizedQueueCode(code),
    unavailable: isUnavailableQueueCode(code),
  };
};

export const fetchConnectShyftResolverQueue = async (): Promise<ConnectShyftResolverQueueListResult> => {
  try {
    const response = await api.get('/connectshyft/resolver-queue', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const envelope = response.data as ResolverQueueEnvelope;
    if (envelope?.ok !== true) {
      return buildListFailure(response.data, 'CONNECTSHYFT_RESOLVER_QUEUE_REFUSED', 'Unable to load resolver queue.');
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_RESOLVER_QUEUE_LISTED',
      message: parseEnvelopeMessage(response.data, 'Resolver queue loaded.'),
      items: Array.isArray(envelope.data?.items)
        ? envelope.data.items
          .map(parseResolverQueueItem)
          .filter((item): item is ConnectShyftResolverQueueItemRecord => item !== null)
        : [],
    };
  } catch (error: unknown) {
    return buildListFailure(
      (error as { response?: { data?: unknown } })?.response?.data,
      'CONNECTSHYFT_RESOLVER_QUEUE_REQUEST_FAILED',
      'Unable to load resolver queue.',
    );
  }
};

export const fetchConnectShyftResolverQueueDetail = async (
  itemType: ConnectShyftResolverQueueItemType,
  itemId: string,
): Promise<ConnectShyftResolverQueueDetailResult> => {
  try {
    const response = await api.get(
      `/connectshyft/resolver-queue/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}`,
      {
        headers: buildConnectShyftTestOverrideHeaders(),
      },
    );
    const envelope = response.data as ResolverQueueEnvelope;
    if (envelope?.ok !== true) {
      return buildDetailFailure(response.data, 'CONNECTSHYFT_RESOLVER_QUEUE_DETAIL_REFUSED', 'Unable to load resolver detail.');
    }

    const detail = parseResolverQueueDetail(response.data);
    if (!detail) {
      return buildDetailFailure(response.data, 'CONNECTSHYFT_RESOLVER_QUEUE_DETAIL_INVALID', 'Resolver detail payload was incomplete.');
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RETRIEVED',
      message: parseEnvelopeMessage(response.data, 'Resolver detail loaded.'),
      detail,
    };
  } catch (error: unknown) {
    return buildDetailFailure(
      (error as { response?: { data?: unknown } })?.response?.data,
      'CONNECTSHYFT_RESOLVER_QUEUE_DETAIL_REQUEST_FAILED',
      'Unable to load resolver detail.',
    );
  }
};

const runResolverQueueMutation = async (
  path: string,
  fallbackCode: string,
  fallbackMessage: string,
): Promise<ConnectShyftResolverQueueDetailResult> => {
  try {
    const response = await api.post(path, undefined, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const envelope = response.data as ResolverQueueEnvelope;
    if (envelope?.ok !== true) {
      return buildDetailFailure(response.data, fallbackCode, fallbackMessage);
    }

    const detail = parseResolverQueueDetail(response.data);
    if (!detail) {
      return buildDetailFailure(response.data, `${fallbackCode}_INVALID`, 'Resolver mutation payload was incomplete.');
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || fallbackCode,
      message: parseEnvelopeMessage(response.data, 'Resolver workspace updated.'),
      detail,
    };
  } catch (error: unknown) {
    return buildDetailFailure(
      (error as { response?: { data?: unknown } })?.response?.data,
      `${fallbackCode}_REQUEST_FAILED`,
      fallbackMessage,
    );
  }
};

export const claimConnectShyftResolverQueueItem = async (
  itemType: ConnectShyftResolverQueueItemType,
  itemId: string,
): Promise<ConnectShyftResolverQueueDetailResult> => runResolverQueueMutation(
  `/connectshyft/resolver-queue/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/claim`,
  'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_CLAIMED',
  'Unable to claim this resolver item right now.',
);

export const releaseConnectShyftResolverQueueItem = async (
  itemType: ConnectShyftResolverQueueItemType,
  itemId: string,
): Promise<ConnectShyftResolverQueueDetailResult> => runResolverQueueMutation(
  `/connectshyft/resolver-queue/${encodeURIComponent(itemType)}/${encodeURIComponent(itemId)}/release`,
  'CONNECTSHYFT_RESOLVER_QUEUE_ITEM_RELEASED',
  'Unable to release this resolver item right now.',
);
