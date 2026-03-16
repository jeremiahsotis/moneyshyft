import type { RequestHandler } from 'express';
import { requestCorrelation as sharedRequestCorrelation } from '../../../../../libs/platform/dist/middleware/requestCorrelation';

export const requestCorrelation: RequestHandler = sharedRequestCorrelation as unknown as RequestHandler;
