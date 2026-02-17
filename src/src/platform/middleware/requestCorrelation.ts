import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { pushPlatformChainStep } from './responseEnvelope';

export const requestCorrelation = (req: Request, res: Response, next: NextFunction): void => {
  const correlationHeader = req.header('x-correlation-id');
  const correlationId = correlationHeader && correlationHeader.trim() !== ''
    ? correlationHeader
    : randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  pushPlatformChainStep(res, 'correlation');
  next();
};
