import { ResponseLike } from '../httpTypes';

export type EnvelopeContext = {
  correlationId: string | null;
  tenantId: string | null;
};

type SuccessEnvelopeParams = {
  code: string;
  message: string;
  data?: unknown;
  httpStatus?: number;
};

type RefusalEnvelopeParams = {
  code: string;
  message: string;
  data?: unknown;
  refusalType?: 'business' | 'client' | 'security';
  httpStatus?: number;
};

type ErrorEnvelopeParams = {
  code: string;
  message: string;
  data?: unknown;
  httpStatus?: number;
};

type ResponseLocalsEnvelope = {
  responseEnvelope?: EnvelopeContext;
};

export type SuccessEnvelopePayload = {
  ok: true;
  code: string;
  message: string;
  correlationId: string | null;
  tenantId: string | null;
  data?: unknown;
};

export type RefusalEnvelopePayload = {
  ok: false;
  code: string;
  message: string;
  refusalType: 'business' | 'client' | 'security';
  correlationId: string | null;
  tenantId: string | null;
  data?: unknown;
};

export type ErrorEnvelopePayload = {
  ok: false;
  code: string;
  message: string;
  errorType: 'system';
  correlationId: string | null;
  tenantId: string | null;
  data?: unknown;
};

export type ApiEnvelopePayload =
  | SuccessEnvelopePayload
  | RefusalEnvelopePayload
  | ErrorEnvelopePayload;

const resolveContext = (res: ResponseLike): EnvelopeContext => {
  const locals = res.locals as ResponseLocalsEnvelope;
  const envelope = locals.responseEnvelope;
  const normalizedTenant = typeof envelope?.tenantId === 'string'
    ? envelope.tenantId.trim()
    : null;
  const tenantId = normalizedTenant && normalizedTenant.toLowerCase() !== 'public'
    ? normalizedTenant
    : null;

  return {
    correlationId: envelope?.correlationId ?? null,
    tenantId,
  };
};

const normalizeEnvelopeTenant = (tenantId: string | null | undefined): string | null => {
  if (typeof tenantId !== 'string') {
    return null;
  }

  const trimmed = tenantId.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'public') {
    return null;
  }

  return trimmed;
};

export const buildSuccessEnvelope = (
  context: EnvelopeContext,
  { code, message, data }: Omit<SuccessEnvelopeParams, 'httpStatus'>
): SuccessEnvelopePayload => ({
  ok: true,
  code,
  message,
  correlationId: context.correlationId,
  tenantId: normalizeEnvelopeTenant(context.tenantId),
  ...(data !== undefined ? { data } : {}),
});

export const buildRefusalEnvelope = (
  context: EnvelopeContext,
  {
    code,
    message,
    data,
    refusalType = 'business',
  }: Omit<RefusalEnvelopeParams, 'httpStatus'>
): RefusalEnvelopePayload => ({
  ok: false,
  code,
  message,
  refusalType,
  correlationId: context.correlationId,
  tenantId: normalizeEnvelopeTenant(context.tenantId),
  ...(data !== undefined ? { data } : {}),
});

export const buildErrorEnvelope = (
  context: EnvelopeContext,
  { code, message, data }: Omit<ErrorEnvelopeParams, 'httpStatus'>
): ErrorEnvelopePayload => ({
  ok: false,
  code,
  message,
  errorType: 'system',
  correlationId: context.correlationId,
  tenantId: normalizeEnvelopeTenant(context.tenantId),
  ...(data !== undefined ? { data } : {}),
});

export const isEnvelopePayload = (value: unknown): value is ApiEnvelopePayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.ok === 'boolean'
    && typeof candidate.code === 'string'
    && typeof candidate.message === 'string'
    && 'correlationId' in candidate
    && 'tenantId' in candidate;
};

export const success = (
  res: ResponseLike,
  { httpStatus = 200, ...params }: SuccessEnvelopeParams
): ResponseLike => {
  const context = resolveContext(res);
  const payload = buildSuccessEnvelope(context, params);
  return res.status(httpStatus).json(payload);
};

export const refusal = (
  res: ResponseLike,
  { httpStatus = 200, ...params }: RefusalEnvelopeParams
): ResponseLike => {
  const context = resolveContext(res);
  const payload = buildRefusalEnvelope(context, params);
  return res.status(httpStatus).json(payload);
};

export const error = (
  res: ResponseLike,
  { httpStatus = 500, ...params }: ErrorEnvelopeParams
): ResponseLike => {
  const context = resolveContext(res);
  const payload = buildErrorEnvelope(context, params);
  return res.status(httpStatus).json(payload);
};

export const systemError = error;

export const replayEnvelope = (
  res: ResponseLike,
  payload: unknown,
  httpStatus = 200
): ResponseLike => res.status(httpStatus).send(payload);
