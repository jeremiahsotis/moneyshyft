import { NextFunction, Request, Response } from 'express';
import { pushPlatformChainStep } from './responseEnvelope';

type RequestWithPlatformContext = Request & {
  user?: {
    userId: string;
    role: string;
    householdId?: string | null;
    activeTenantId?: string | null;
    activeOrgUnitId?: string | null;
  } | null;
  tenantId?: string | null;
  orgUnitId?: string | null;
  scopeMode?: 'TENANT' | 'ORG_UNIT';
  authContext?: unknown;
};

export const authContext = (req: Request, res: Response, next: NextFunction): void => {
  const request = req as RequestWithPlatformContext;
  request.authContext = request.user
    ? {
      userId: request.user.userId,
      role: request.user.role,
      householdId: request.user.householdId || null,
      activeTenantId: request.user.activeTenantId || request.tenantId || null,
      orgUnitId: request.user.activeOrgUnitId || request.orgUnitId || null,
      scopeMode: request.scopeMode || 'TENANT',
    }
    : null;

  pushPlatformChainStep(res, 'auth-context');
  next();
};
