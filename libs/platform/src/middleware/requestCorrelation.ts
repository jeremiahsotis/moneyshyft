import { randomUUID } from 'crypto';
import { pushPlatformChainStep } from './responseEnvelope';
import { NextLike, RequestLike, ResponseLike } from '../httpTypes';

type RequestWithCorrelation = RequestLike & {
  correlationId?: string;
};

export const requestCorrelation = (req: RequestLike, res: ResponseLike, next: NextLike): void => {
  const request = req as RequestWithCorrelation;
  const correlationHeader = req.header('x-correlation-id');
  const correlationId = correlationHeader && correlationHeader.trim() !== ''
    ? correlationHeader
    : randomUUID();

  request.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  pushPlatformChainStep(res, 'correlation');
  next();
};
