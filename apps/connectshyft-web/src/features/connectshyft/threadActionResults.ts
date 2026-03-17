export type ConnectShyftThreadActionUiFeedback = {
  severity?: unknown;
  ariaLive?: unknown;
  messageKey?: unknown;
  presentation?: unknown;
  requiresAction?: unknown;
  actionLabel?: unknown;
  accessibilityHint?: unknown;
  message?: unknown;
  heading?: unknown;
  hiddenTransition?: unknown;
};

export type ConnectShyftThreadActionPreferencePolicy = {
  prefersTexting?: unknown;
  source?: unknown;
  overrideRequired?: unknown;
  overrideAccepted?: unknown;
  allowedOverrideReasons?: unknown;
  override?: unknown;
};

export type ConnectShyftThreadActionData = {
  thread?: unknown;
  lifecycle?: unknown;
  lifecycleEvent?: unknown;
  operatorFeedback?: unknown;
  operatorFeedbackMeta?: unknown;
  uiFeedback?: ConnectShyftThreadActionUiFeedback;
  preferencePolicy?: ConnectShyftThreadActionPreferencePolicy;
  [key: string]: unknown;
};

export type ConnectShyftThreadActionEnvelope = {
  ok?: boolean;
  code?: unknown;
  message?: unknown;
  refusalType?: unknown;
  errorType?: unknown;
  data?: unknown;
};

export type ConnectShyftThreadActionFailureKind = 'refusal' | 'error';

export type ConnectShyftThreadActionFailure = {
  ok: false;
  failureKind: ConnectShyftThreadActionFailureKind;
  code: string;
  message: string;
  refusalType: string | null;
  errorType: string | null;
  data: ConnectShyftThreadActionData | null;
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

const parseThreadActionData = (payload: unknown): ConnectShyftThreadActionData | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as ConnectShyftThreadActionEnvelope;
  if (!candidate.data || typeof candidate.data !== 'object') {
    return null;
  }

  return candidate.data as ConnectShyftThreadActionData;
};

const parseActionMessage = (
  payload: unknown,
  fallbackMessage: string,
  options: {
    preferUiFeedback?: boolean;
  } = {},
): string => {
  const data = parseThreadActionData(payload);
  const uiFeedbackMessage = normalizeString(data?.uiFeedback?.message);
  if (options.preferUiFeedback && uiFeedbackMessage) {
    return uiFeedbackMessage;
  }

  if (payload && typeof payload === 'object') {
    const envelope = payload as ConnectShyftThreadActionEnvelope;
    const message = normalizeString(envelope.message);
    if (message) {
      return message;
    }
  }

  if (uiFeedbackMessage) {
    return uiFeedbackMessage;
  }

  return fallbackMessage;
};

const buildThreadActionFailure = (
  failureKind: ConnectShyftThreadActionFailureKind,
  payload: unknown,
  input: {
    fallbackCode: string;
    fallbackMessage: string;
    preferUiFeedbackMessage?: boolean;
  },
): ConnectShyftThreadActionFailure => {
  const envelope = payload && typeof payload === 'object'
    ? payload as ConnectShyftThreadActionEnvelope
    : null;

  const parsedCode = normalizeString(envelope?.code);
  const fallbackCode = failureKind === 'error'
    ? `${input.fallbackCode}_REQUEST_FAILED`
    : input.fallbackCode;

  return {
    ok: false,
    failureKind,
    code: parsedCode || fallbackCode,
    message: parseActionMessage(payload, input.fallbackMessage, {
      preferUiFeedback: input.preferUiFeedbackMessage,
    }),
    refusalType: normalizeOptionalString(envelope?.refusalType),
    errorType: normalizeOptionalString(envelope?.errorType),
    data: parseThreadActionData(payload),
  };
};

export const createConnectShyftThreadActionRefusal = (
  payload: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): ConnectShyftThreadActionFailure => {
  return buildThreadActionFailure('refusal', payload, {
    fallbackCode,
    fallbackMessage,
  });
};

export const createConnectShyftThreadActionTransportFailure = (
  payload: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): ConnectShyftThreadActionFailure => {
  return buildThreadActionFailure('error', payload, {
    fallbackCode,
    fallbackMessage,
    preferUiFeedbackMessage: true,
  });
};
