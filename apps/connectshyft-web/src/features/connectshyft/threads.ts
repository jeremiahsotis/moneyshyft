import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';

export type ConnectShyftThreadState = 'UNCLAIMED' | 'CLAIMED' | 'CLOSED';

export type ConnectShyftThread = {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  source: string;
  state: ConnectShyftThreadState;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  escalation: {
    stage: number;
    nextEvaluationAtUtc: string | null;
  };
  claimedByUserId: string | null;
  claimedAtUtc: string | null;
  closedByUserId: string | null;
  closedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

type ConnectShyftEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: {
    thread?: Partial<ConnectShyftThread>;
    threads?: Partial<ConnectShyftThread>[];
  };
};

export type ConnectShyftDueThreadsResult =
  | {
    ok: true;
    code: string;
    threads: ConnectShyftThread[];
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

export type ConnectShyftEnsureThreadInput = {
  orgUnitId: string;
  neighborId: string;
  source?: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

export type ConnectShyftEnsureThreadResult =
  | {
    ok: true;
    code: string;
    thread: ConnectShyftThread;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const CANONICAL_THREAD_STATES = new Set<ConnectShyftThreadState>([
  'UNCLAIMED',
  'CLAIMED',
  'CLOSED',
]);

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

const parseThreadState = (value: unknown): ConnectShyftThreadState => {
  const normalized = normalizeString(value).toUpperCase() as ConnectShyftThreadState;
  if (CANONICAL_THREAD_STATES.has(normalized)) {
    return normalized;
  }

  return 'UNCLAIMED';
};

const parseThread = (payload: unknown): ConnectShyftThread | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Partial<ConnectShyftThread> & {
    escalation?: {
      stage?: unknown;
      nextEvaluationAtUtc?: unknown;
    };
  };
  const threadId = normalizeString(candidate.threadId);
  const tenantId = normalizeString(candidate.tenantId);
  const orgUnitId = normalizeString(candidate.orgUnitId);
  const neighborId = normalizeString(candidate.neighborId);
  const source = normalizeString(candidate.source);

  if (!threadId || !tenantId || !orgUnitId || !neighborId) {
    return null;
  }

  const rawStage = candidate.escalation?.stage;
  const escalationStage = typeof rawStage === 'number' && Number.isInteger(rawStage) && rawStage >= 0
    ? rawStage
    : 0;

  return {
    threadId,
    tenantId,
    orgUnitId,
    neighborId,
    source: source || 'VOICE',
    state: parseThreadState(candidate.state),
    lastInboundCsNumberId: normalizeString(candidate.lastInboundCsNumberId),
    preferredOutboundCsNumberId: normalizeString(candidate.preferredOutboundCsNumberId),
    escalation: {
      stage: escalationStage,
      nextEvaluationAtUtc: normalizeOptionalString(candidate.escalation?.nextEvaluationAtUtc),
    },
    claimedByUserId: normalizeOptionalString(candidate.claimedByUserId),
    claimedAtUtc: normalizeOptionalString(candidate.claimedAtUtc),
    closedByUserId: normalizeOptionalString(candidate.closedByUserId),
    closedAtUtc: normalizeOptionalString(candidate.closedAtUtc),
    createdAtUtc: normalizeString(candidate.createdAtUtc),
    updatedAtUtc: normalizeString(candidate.updatedAtUtc),
  };
};

const parseRefusalMessage = (payload: unknown, fallbackMessage: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const envelope = payload as ConnectShyftEnvelope;
  if (typeof envelope.message === 'string' && envelope.message.trim().length > 0) {
    return envelope.message;
  }

  return fallbackMessage;
};

const resolveScopeFromQuery = (): { tenantId: string | null; orgUnitId: string | null } => {
  if (typeof window === 'undefined') {
    return {
      tenantId: null,
      orgUnitId: null,
    };
  }

  const query = new URLSearchParams(window.location.search);
  const contextMode = normalizeString(query.get('context'));
  const tenantId = normalizeOptionalString(query.get('tenantId'));
  const orgUnitId = contextMode.toLowerCase() === 'missing-orgunit'
    ? null
    : normalizeOptionalString(query.get('orgUnitId'));

  return {
    tenantId,
    orgUnitId,
  };
};

const parseThreads = (payload: unknown): ConnectShyftThread[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const envelope = payload as ConnectShyftEnvelope;
  const rawThreads = envelope.data?.threads;
  if (!Array.isArray(rawThreads)) {
    return [];
  }

  return rawThreads
    .map((entry) => parseThread(entry))
    .filter((entry): entry is ConnectShyftThread => entry !== null);
};

export const fetchConnectShyftDueThreads = async (): Promise<ConnectShyftDueThreadsResult> => {
  const scope = resolveScopeFromQuery();
  const params: Record<string, string | number> = { limit: 50 };
  if (scope.tenantId) {
    params.tenantId = scope.tenantId;
  }
  if (scope.orgUnitId) {
    params.orgUnitId = scope.orgUnitId;
  }

  try {
    const response = await api.get('/connectshyft/internal/threads/due', {
      params,
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string'
          ? envelope.code
          : 'CONNECTSHYFT_DUE_THREADS_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to load due threads right now.',
        ),
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string'
        ? envelope.code
        : 'CONNECTSHYFT_DUE_THREADS_LISTED',
      threads: parseThreads(response.data),
    };
  } catch (error: unknown) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_DUE_THREADS_REQUEST_FAILED',
      message: parseRefusalMessage(
        (error as { response?: { data?: unknown } })?.response?.data,
        'Unable to load due threads right now.',
      ),
    };
  }
};

export const ensureConnectShyftThread = async (
  input: ConnectShyftEnsureThreadInput,
): Promise<ConnectShyftEnsureThreadResult> => {
  const payload = {
    orgUnitId: normalizeString(input.orgUnitId),
    neighborId: normalizeString(input.neighborId),
    source: normalizeString(input.source) || 'VOICE',
    lastInboundCsNumberId: normalizeString(input.lastInboundCsNumberId),
    preferredOutboundCsNumberId: normalizeString(input.preferredOutboundCsNumberId),
  };

  try {
    const response = await api.post('/connectshyft/threads', payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string'
          ? envelope.code
          : 'CONNECTSHYFT_THREAD_ENSURE_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to open a conversation right now.',
        ),
      };
    }

    const thread = parseThread(envelope.data?.thread);
    if (!thread) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_THREAD_ENSURE_INVALID_RESPONSE',
        message: 'ConnectShyft thread response was incomplete.',
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string'
        ? envelope.code
        : 'CONNECTSHYFT_THREAD_ENSURED',
      thread,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_THREAD_ENSURE_REQUEST_FAILED',
      message: parseRefusalMessage(
        (error as { response?: { data?: unknown } })?.response?.data,
        'Unable to open a conversation right now.',
      ),
    };
  }
};
