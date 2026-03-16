import { pushPlatformChainStep } from './responseEnvelope';
import { resolveTenantRequestContext } from '../tenancy/requestContext';
import { NextLike, RequestLike, ResponseLike } from '../httpTypes';

type RequestUser = {
  activeTenantId?: string | null;
  householdId?: string | null;
  activeOrgUnitId?: string | null;
} | null;

type TenancyContextDependencies = {
  verifyAccessToken: (token: string) => RequestUser;
};

type RequestWithTenancyContext = RequestLike & {
  user?: RequestUser;
  tenantId?: string;
  orgUnitId?: string | null;
  scopeMode?: 'TENANT' | 'ORG_UNIT';
  tenantContext?: unknown;
};

export const createTenancyContextMiddleware = ({
  verifyAccessToken,
}: TenancyContextDependencies) => (req: RequestLike, res: ResponseLike, next: NextLike): void => {
  const request = req as RequestWithTenancyContext;
  const accessToken = request.cookies?.access_token;

  if (!request.user && typeof accessToken === 'string' && accessToken.trim() !== '') {
    try {
      request.user = verifyAccessToken(accessToken);
    } catch (_error) {
      // Invalid token is handled by auth middleware on protected routes.
    }
  }

  const context = resolveTenantRequestContext(request);
  const resolvedTenantId = context.tenantId;

  request.tenantId = resolvedTenantId;
  request.orgUnitId = context.orgUnitId;
  request.scopeMode = context.scopeMode;
  request.tenantContext = context;
  res.setHeader('x-tenant-id', resolvedTenantId);
  if (context.orgUnitId) {
    res.setHeader('x-org-unit-id', context.orgUnitId);
  }
  res.setHeader('x-scope-mode', context.scopeMode);
  pushPlatformChainStep(res, 'tenancy');
  next();
};
