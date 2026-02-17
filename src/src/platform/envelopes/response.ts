import { Response } from 'express';

type EnvelopeContext = {
  correlationId: string | null;
  tenantId: string | null;
};

type SuccessEnvelopeParams = {
  code: string;
  message: string;
  data?: unknown;
};

type RefusalEnvelopeParams = {
  code: string;
  message: string;
  data?: unknown;
  refusalType?: 'business';
};

type ResponseLocalsEnvelope = {
  responseEnvelope?: EnvelopeContext;
};

const resolveContext = (res: Response): EnvelopeContext => {
  const locals = res.locals as ResponseLocalsEnvelope;
  const envelope = locals.responseEnvelope;

  return {
    correlationId: envelope?.correlationId ?? null,
    tenantId: envelope?.tenantId ?? null
  };
};

export const success = (
  res: Response,
  { code, message, data }: SuccessEnvelopeParams
): Response => {
  const context = resolveContext(res);

  const payload = {
    ok: true,
    code,
    message,
    correlationId: context.correlationId,
    tenantId: context.tenantId,
    ...(data !== undefined ? { data } : {})
  };

  return res.status(200).json(payload);
};

export const refusal = (
  res: Response,
  { code, message, data, refusalType = 'business' }: RefusalEnvelopeParams
): Response => {
  const context = resolveContext(res);

  const payload = {
    ok: false,
    code,
    message,
    refusalType,
    correlationId: context.correlationId,
    tenantId: context.tenantId,
    ...(data !== undefined ? { data } : {})
  };

  return res.status(200).json(payload);
};
