import { NextFunction, Request, Response } from 'express';

type ResponseLocalsWithChain = {
  platformMiddlewareChain?: string[];
};

const recordChainStep = (res: Response, step: string): string[] => {
  const locals = res.locals as ResponseLocalsWithChain;
  const chain = locals.platformMiddlewareChain || [];
  chain.push(step);
  locals.platformMiddlewareChain = chain;
  return chain;
};

export const responseEnvelope = (req: Request, res: Response, next: NextFunction): void => {
  const chain = recordChainStep(res, 'response-envelope');

  if (process.env.NODE_ENV === 'test') {
    res.setHeader('x-platform-middleware-chain', chain.join(','));
  }

  res.locals.responseEnvelope = {
    ok: true,
    correlationId: req.correlationId || null,
    tenantId: req.tenantId || null
  };

  next();
};

export const pushPlatformChainStep = (res: Response, step: string): void => {
  recordChainStep(res, step);
};
