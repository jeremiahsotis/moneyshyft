import api from '@/services/api';
import { buildConnectShyftTestOverrideHeaders } from '@/features/connectshyft/flags';
import {
  createConnectShyftThreadActionRefusal,
  createConnectShyftThreadActionTransportFailure,
  type ConnectShyftThreadActionData,
  type ConnectShyftThreadActionEnvelope as BaseConnectShyftThreadActionEnvelope,
  type ConnectShyftThreadActionFailure,
} from './threadActionResults';

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

type ConnectShyftEnvelope = BaseConnectShyftThreadActionEnvelope & {
  data?: ConnectShyftThreadActionData & {
    thread?: Partial<ConnectShyftThread>;
    threads?: Partial<ConnectShyftThread>[];
    lifecycle?: {
      createdNewThread?: unknown;
    };
    uiFeedback?: {
      message?: unknown;
    };
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
  personId?: string;
  source?: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

export type ConnectShyftEnsureThreadResult =
  | {
    ok: true;
    code: string;
    thread: ConnectShyftThread;
    createdNewThread: boolean;
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

export type ConnectShyftThreadLifecycleAction = 'claim' | 'takeover' | 'close';

export type ConnectShyftThreadLifecycleActionInput = {
  threadId: string;
  orgUnitId: string;
  action: ConnectShyftThreadLifecycleAction;
  reason?: string;
  resolution?: string;
};

export type ConnectShyftThreadDispatchCallInput = {
  threadId: string;
  orgUnitId: string;
  targetPhone?: string | null;
};

export type ConnectShyftThreadDispatchMessageInput = {
  threadId: string;
  orgUnitId: string;
  body: string;
  targetPhone?: string | null;
  overrideReason?: string | null;
  overrideNote?: string | null;
};

export type ConnectShyftThreadActionResult =
  | {
    ok: true;
    code: string;
    message: string;
    thread: ConnectShyftThread | null;
  }
  | ConnectShyftThreadActionFailure;

export type { ConnectShyftThreadActionFailure };

export type ConnectShyftConversationLaunchPrepareInput = {
  orgUnitId: string;
  neighborId?: string | null;
  targetPhone: string;
  source?: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
};

export type ConnectShyftConversationLaunchPrepareResult =
  | {
    ok: true;
    code: string;
    thread: ConnectShyftThread;
    createdNewThread: boolean;
    neighborId: string;
    targetPhone: string;
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

const parseActionSuccessMessage = (payload: unknown, fallbackMessage: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const envelope = payload as ConnectShyftEnvelope;
  const uiFeedbackMessage = normalizeString(envelope.data?.uiFeedback?.message);
  if (uiFeedbackMessage) {
    return uiFeedbackMessage;
  }

  return parseRefusalMessage(payload, fallbackMessage);
};

const createInlineThreadActionRefusal = (
  code: string,
  message: string,
): ConnectShyftThreadActionFailure => {
  return {
    ok: false,
    failureKind: 'refusal',
    code,
    message,
    refusalType: 'client',
    errorType: null,
    data: null,
  };
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

const parseCreatedNewThread = (payload: unknown, thread: ConnectShyftThread): boolean => {
  if (payload && typeof payload === 'object') {
    const envelope = payload as ConnectShyftEnvelope;
    if (envelope.data?.lifecycle?.createdNewThread === true) {
      return true;
    }

    if (envelope.data?.lifecycle?.createdNewThread === false) {
      return false;
    }
  }

  if (thread.createdAtUtc && thread.updatedAtUtc) {
    return thread.createdAtUtc === thread.updatedAtUtc;
  }

  return true;
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
    personId: normalizeString(input.personId),
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
      createdNewThread: parseCreatedNewThread(response.data, thread),
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

export const prepareConnectShyftConversationLaunch = async (
  input: ConnectShyftConversationLaunchPrepareInput,
): Promise<ConnectShyftConversationLaunchPrepareResult> => {
  const payload = {
    orgUnitId: normalizeString(input.orgUnitId),
    neighborId: normalizeString(input.neighborId || null) || undefined,
    targetPhone: normalizeString(input.targetPhone),
    source: normalizeString(input.source) || 'LAUNCHER',
    lastInboundCsNumberId: normalizeString(input.lastInboundCsNumberId),
    preferredOutboundCsNumberId: normalizeString(input.preferredOutboundCsNumberId),
  };

  try {
    const response = await api.post('/connectshyft/conversation-launcher', payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });

    const envelope = response.data as ConnectShyftEnvelope & {
      data?: {
        target?: {
          neighborId?: unknown;
          phone?: unknown;
        };
      };
    };
    if (envelope?.ok !== true) {
      return {
        ok: false,
        code: typeof envelope?.code === 'string'
          ? envelope.code
          : 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREP_REFUSED',
        message: parseRefusalMessage(
          response.data,
          'Unable to start that conversation right now.',
        ),
      };
    }

    const thread = parseThread(envelope.data?.thread);
    const neighborId = normalizeString(envelope.data?.target?.neighborId);
    const targetPhone = normalizeString(envelope.data?.target?.phone);
    if (!thread || !neighborId || !targetPhone) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREP_INVALID_RESPONSE',
        message: 'Conversation launcher response was incomplete.',
      };
    }

    return {
      ok: true,
      code: typeof envelope.code === 'string'
        ? envelope.code
        : 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREPARED',
      thread,
      createdNewThread: parseCreatedNewThread(response.data, thread),
      neighborId,
      targetPhone,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PREP_REQUEST_FAILED',
      message: parseRefusalMessage(
        (error as { response?: { data?: unknown } })?.response?.data,
        'Unable to start that conversation right now.',
      ),
    };
  }
};

const executeConnectShyftThreadAction = async (
  path: string,
  payload: Record<string, unknown>,
  fallbackCode: string,
  fallbackMessage: string,
): Promise<ConnectShyftThreadActionResult> => {
  try {
    const response = await api.post(path, payload, {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    const envelope = response.data as ConnectShyftEnvelope;
    if (envelope?.ok !== true) {
      return createConnectShyftThreadActionRefusal(
        response.data,
        fallbackCode,
        fallbackMessage,
      );
    }

    return {
      ok: true,
      code: normalizeString(envelope.code) || 'CONNECTSHYFT_THREAD_ACTION_COMPLETED',
      message: parseActionSuccessMessage(response.data, 'Thread action completed.'),
      thread: parseThread(envelope.data?.thread),
    };
  } catch (error: unknown) {
    const errorPayload = (error as { response?: { data?: unknown } })?.response?.data;
    if (
      errorPayload
      && typeof errorPayload === 'object'
      && (errorPayload as { ok?: unknown }).ok === false
    ) {
      return createConnectShyftThreadActionRefusal(
        errorPayload,
        fallbackCode,
        fallbackMessage,
      );
    }

    return createConnectShyftThreadActionTransportFailure(
      errorPayload,
      fallbackCode,
      fallbackMessage,
    );
  }
};

export const performConnectShyftThreadLifecycleAction = async (
  input: ConnectShyftThreadLifecycleActionInput,
): Promise<ConnectShyftThreadActionResult> => {
  const threadId = normalizeString(input.threadId);
  if (!threadId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_THREAD_ID_REQUIRED',
      'Thread id is required.',
    );
  }

  const orgUnitId = normalizeString(input.orgUnitId);
  if (!orgUnitId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_ORGUNIT_REQUIRED',
      'orgUnitId is required.',
    );
  }

  const actionPath = `/connectshyft/threads/${encodeURIComponent(threadId)}/${input.action}`;
  const payload: Record<string, unknown> = {
    orgUnitId,
  };

  if (input.action === 'takeover') {
    payload.reason = normalizeString(input.reason) || 'operator-takeover';
  }

  if (input.action === 'close') {
    payload.resolution = normalizeString(input.resolution) || 'operator-close';
  }

  return executeConnectShyftThreadAction(
    actionPath,
    payload,
    `CONNECTSHYFT_THREAD_${input.action.toUpperCase()}_REFUSED`,
    'Unable to complete that thread action.',
  );
};

export const dispatchConnectShyftThreadCall = async (
  input: ConnectShyftThreadDispatchCallInput,
): Promise<ConnectShyftThreadActionResult> => {
  const threadId = normalizeString(input.threadId);
  const orgUnitId = normalizeString(input.orgUnitId);
  const targetPhone = normalizeString(input.targetPhone);
  if (!threadId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_THREAD_ID_REQUIRED',
      'Thread id is required.',
    );
  }
  if (!orgUnitId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_ORGUNIT_REQUIRED',
      'orgUnitId is required.',
    );
  }

  return executeConnectShyftThreadAction(
    `/connectshyft/threads/${encodeURIComponent(threadId)}/call`,
    {
      orgUnitId,
      targetPhone: targetPhone || undefined,
    },
    'CONNECTSHYFT_THREAD_CALL_DISPATCH_REFUSED',
    'Unable to place the call right now.',
  );
};

export const dispatchConnectShyftThreadMessage = async (
  input: ConnectShyftThreadDispatchMessageInput,
): Promise<ConnectShyftThreadActionResult> => {
  const threadId = normalizeString(input.threadId);
  const orgUnitId = normalizeString(input.orgUnitId);
  const body = normalizeString(input.body);
  const targetPhone = normalizeString(input.targetPhone);
  if (!threadId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_THREAD_ID_REQUIRED',
      'Thread id is required.',
    );
  }
  if (!orgUnitId) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_ORGUNIT_REQUIRED',
      'orgUnitId is required.',
    );
  }
  if (!body) {
    return createInlineThreadActionRefusal(
      'CONNECTSHYFT_MESSAGE_BODY_REQUIRED',
      'Enter a message before sending.',
    );
  }

  return executeConnectShyftThreadAction(
    `/connectshyft/threads/${encodeURIComponent(threadId)}/messages`,
    {
      orgUnitId,
      channel: 'sms',
      body,
      targetPhone: targetPhone || undefined,
      overrideReason: normalizeString(input.overrideReason) || undefined,
      overrideNote: normalizeString(input.overrideNote) || undefined,
    },
    'CONNECTSHYFT_THREAD_MESSAGE_DISPATCH_REFUSED',
    'Unable to send the message right now.',
  );
};
