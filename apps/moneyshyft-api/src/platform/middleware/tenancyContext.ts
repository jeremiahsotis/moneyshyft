import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../../utils/jwt';
import { createTenancyContextMiddleware } from '../../../../../libs/platform/dist/middleware/tenancyContext';

export const tenancyContext: RequestHandler = createTenancyContextMiddleware({
  verifyAccessToken,
}) as unknown as RequestHandler;
