type AuthPayload = {
  userId: string;
  role: string;
  householdId: string | null;
  activeTenantId?: string | null;
  activeOrgUnitId?: string | null;
  mustResetPassword?: boolean;
};

type AuthDependencies = {
  verifyAccessToken: (token: string) => AuthPayload;
  requireTenantId: (tenantId: string) => string;
  isTenantScopeError: (error: unknown) => boolean;
  logError: (...args: unknown[]) => void;
};

type RequestLike = {
  originalUrl?: string;
  cookies?: Record<string, string | undefined>;
};

type RequestWithUser = RequestLike & {
  user?: AuthPayload | null;
};

type JsonResponseLike = {
  json(payload: unknown): unknown;
};

type ResponseLike = {
  status(code: number): JsonResponseLike;
};

type NextLike = () => unknown;

const isPasswordResetExemptRequest = (req: RequestLike): boolean => {
  const originalUrl = req.originalUrl ?? '';

  if (originalUrl.startsWith('/api/v1/auth/')) {
    return true;
  }

  if (originalUrl === '/api/v1/platform/admin/rbac/evaluate') {
    return true;
  }

  return false;
};

export const createAuthMiddleware = ({
  verifyAccessToken,
  requireTenantId,
  isTenantScopeError,
  logError,
}: AuthDependencies) => {
  const authenticateToken = (
    req: RequestLike,
    res: ResponseLike,
    next: NextLike
  ): void => {
    const request = req as RequestWithUser;
    try {
      const token = request.cookies?.access_token;

      if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const payload = verifyAccessToken(token);
      const resolvedActiveTenant = payload.activeTenantId;
      if (resolvedActiveTenant !== null && resolvedActiveTenant !== undefined) {
        payload.activeTenantId = requireTenantId(resolvedActiveTenant);
      } else {
        payload.activeTenantId = null;
      }
      payload.householdId = payload.householdId ?? null;
      payload.activeOrgUnitId = payload.activeOrgUnitId ?? null;

      if (payload.mustResetPassword === true && !isPasswordResetExemptRequest(request)) {
        res.status(403).json({
          code: 'PASSWORD_RESET_REQUIRED',
          error: 'Password reset required before accessing this resource',
        });
        return;
      }

      request.user = payload;
      next();
    } catch (error) {
      if (isTenantScopeError(error)) {
        res.status(403).json({ error: (error as Error).message });
        return;
      }
      logError('Authentication error:', error);
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  const optionalAuth = (req: RequestLike, _res: ResponseLike, next: NextLike): void => {
    const request = req as RequestWithUser;
    try {
      const token = request.cookies?.access_token;

      if (token) {
        const payload = verifyAccessToken(token);
        const resolvedActiveTenant = payload.activeTenantId;
        if (resolvedActiveTenant !== null && resolvedActiveTenant !== undefined) {
          payload.activeTenantId = requireTenantId(resolvedActiveTenant);
        } else {
          payload.activeTenantId = null;
        }
        payload.householdId = payload.householdId ?? null;
        payload.activeOrgUnitId = payload.activeOrgUnitId ?? null;
        request.user = payload;
      }

      next();
    } catch (_error) {
      next();
    }
  };

  const requireRole = (role: string) => (
    req: RequestLike,
    res: ResponseLike,
    next: NextLike
  ): void => {
    const request = req as RequestWithUser;
    if (!request.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (request.user.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };

  const requireHouseholdAccess = (
    req: RequestLike,
    res: ResponseLike,
    next: NextLike
  ): void => {
    const request = req as RequestWithUser;
    if (!request.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!request.user.householdId) {
      res.status(403).json({ error: 'No household assigned to this user' });
      return;
    }

    next();
  };

  return {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireHouseholdAccess,
  };
};
