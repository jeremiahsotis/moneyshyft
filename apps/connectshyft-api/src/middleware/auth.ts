import { createAuthMiddleware } from '../../../../libs/http/dist/auth';
import { verifyAccessToken } from '../utils/jwt';
import logger from '../utils/logger';
import { requireTenantId, TenantScopeError } from '../platform/tenancy/tenantScope';

const authMiddleware = createAuthMiddleware({
  verifyAccessToken,
  requireTenantId,
  isTenantScopeError: (error: unknown): boolean => error instanceof TenantScopeError,
  logError: (message: unknown, error?: unknown) => logger.error(message as any, error as any),
});

export const {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireHouseholdAccess,
} = authMiddleware;
