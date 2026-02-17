import { NextFunction, Request, Response } from 'express';
import { pushPlatformChainStep } from './responseEnvelope';

export const tenancyContext = (req: Request, res: Response, next: NextFunction): void => {
  const tenantHeader = req.header('x-tenant-id');
  const resolvedTenantId = tenantHeader && tenantHeader.trim() !== ''
    ? tenantHeader
    : req.user?.householdId || 'public';

  req.tenantId = resolvedTenantId;
  res.setHeader('x-tenant-id', resolvedTenantId);
  pushPlatformChainStep(res, 'tenancy');
  next();
};
