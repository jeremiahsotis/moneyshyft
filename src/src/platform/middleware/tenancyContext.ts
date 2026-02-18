import { NextFunction, Request, Response } from 'express';
import { pushPlatformChainStep } from './responseEnvelope';
import { verifyAccessToken } from '../../utils/jwt';
import { resolveTenantRequestContext } from '../tenancy/requestContext';

export const tenancyContext = (req: Request, res: Response, next: NextFunction): void => {
  const accessToken = req.cookies?.access_token;

  if (!req.user && typeof accessToken === 'string' && accessToken.trim() !== '') {
    try {
      req.user = verifyAccessToken(accessToken);
    } catch (_error) {
      // Invalid token is handled by auth middleware on protected routes.
    }
  }

  const context = resolveTenantRequestContext(req);
  const resolvedTenantId = context.tenantId;

  req.tenantId = resolvedTenantId;
  req.orgUnitId = context.orgUnitId;
  req.scopeMode = context.scopeMode;
  req.tenantContext = context;
  res.setHeader('x-tenant-id', resolvedTenantId);
  if (context.orgUnitId) {
    res.setHeader('x-org-unit-id', context.orgUnitId);
  }
  res.setHeader('x-scope-mode', context.scopeMode);
  pushPlatformChainStep(res, 'tenancy');
  next();
};
