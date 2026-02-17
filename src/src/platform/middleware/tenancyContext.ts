import { NextFunction, Request, Response } from 'express';
import { pushPlatformChainStep } from './responseEnvelope';
import { verifyAccessToken } from '../../utils/jwt';

export const tenancyContext = (req: Request, res: Response, next: NextFunction): void => {
  const accessToken = req.cookies?.access_token;

  if (!req.user && typeof accessToken === 'string' && accessToken.trim() !== '') {
    try {
      req.user = verifyAccessToken(accessToken);
    } catch (_error) {
      // Invalid token is handled by auth middleware on protected routes.
    }
  }

  const resolvedTenantId = req.user?.householdId || 'public';

  req.tenantId = resolvedTenantId;
  res.setHeader('x-tenant-id', resolvedTenantId);
  pushPlatformChainStep(res, 'tenancy');
  next();
};
