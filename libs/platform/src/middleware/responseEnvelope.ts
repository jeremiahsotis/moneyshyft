import {
  buildRefusalEnvelope,
  buildSuccessEnvelope,
  buildErrorEnvelope,
  EnvelopeContext,
  isEnvelopePayload,
} from '../envelopes/response';
import { NextLike, RequestLike, ResponseLike } from '../httpTypes';

type RequestWithEnvelopeContext = RequestLike & {
  correlationId?: string | null;
  tenantId?: string | null;
};

type ResponseLocalsWithChain = {
  platformMiddlewareChain?: string[];
  responseEnvelope?: EnvelopeContext;
};

const recordChainStep = (res: ResponseLike, step: string): string[] => {
  const locals = res.locals as ResponseLocalsWithChain;
  const chain = locals.platformMiddlewareChain || [];
  chain.push(step);
  locals.platformMiddlewareChain = chain;
  return chain;
};

export const responseEnvelope = (req: RequestLike, res: ResponseLike, next: NextLike): void => {
  const request = req as RequestWithEnvelopeContext;
  const chain = recordChainStep(res, 'response-envelope');

  if (process.env.NODE_ENV === 'test') {
    res.setHeader('x-platform-middleware-chain', chain.join(','));
  }

  res.locals.responseEnvelope = {
    correlationId: request.correlationId || null,
    tenantId: request.tenantId || null,
  };

  if (request.path?.startsWith('/api/')) {
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    res.json = ((body: unknown): ResponseLike => {
      if (isEnvelopePayload(body)) {
        return originalJson(body);
      }

      const statusCode = res.statusCode || 200;
      const context = (res.locals.responseEnvelope as EnvelopeContext | undefined) || {
        correlationId: null,
        tenantId: null,
      };
      const message = deriveMessage(body, statusCode);
      const code = deriveCode(body, statusCode);
      const data = extractData(body);

      if (statusCode >= 500) {
        const payload = buildErrorEnvelope(context, {
          code,
          message,
          ...(data !== undefined ? { data } : {}),
        });
        originalStatus(statusCode);
        return originalJson(payload);
      }

      if (statusCode >= 400) {
        const payload = buildRefusalEnvelope(context, {
          code,
          message,
          refusalType: 'client',
          ...(data !== undefined ? { data } : {}),
        });
        originalStatus(statusCode);
        return originalJson(payload);
      }

      const payload = buildSuccessEnvelope(context, {
        code,
        message,
        ...(data !== undefined ? { data } : {}),
      });
      originalStatus(statusCode);
      return originalJson(payload);
    }) as ResponseLike['json'];
  }

  next();
};

export const pushPlatformChainStep = (res: ResponseLike, step: string): void => {
  recordChainStep(res, step);
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const extractData = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const record = body as Record<string, unknown>;
  if ('data' in record && record.data !== undefined) {
    return record.data;
  }

  const { code, error, message, ...rest } = record;
  void code;
  void error;
  void message;

  return Object.keys(rest).length > 0 ? rest : undefined;
};

const deriveMessage = (body: unknown, statusCode: number): string => {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    return normalizeText(record.message)
      || normalizeText(record.error)
      || defaultMessage(statusCode);
  }

  return normalizeText(body) || defaultMessage(statusCode);
};

const deriveCode = (body: unknown, statusCode: number): string => {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const explicitCode = normalizeText(record.code);

    if (explicitCode) {
      return explicitCode;
    }
  }

  if (statusCode >= 400) {
    return `HTTP_${statusCode}`;
  }

  return statusCode === 200 ? 'REQUEST_SUCCESS' : `HTTP_${statusCode}`;
};

const defaultMessage = (statusCode: number): string => {
  if (statusCode >= 500) {
    return 'Internal server error';
  }

  if (statusCode >= 400) {
    return 'Request refused';
  }

  return 'Request succeeded';
};
