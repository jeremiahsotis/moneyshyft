import { JWTPayload } from '../utils/jwt';
import { ScopeMode, TenantRequestContext } from '../platform/tenancy/requestContext';

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      role: string;
      householdId: string | null;
      activeTenantId: string | null;
      orgUnitId: string | null;
      scopeMode: ScopeMode;
    }

    interface Request {
      user?: JWTPayload;
      correlationId?: string;
      rawBody?: Buffer;
      tenantId?: string;
      orgUnitId?: string | null;
      scopeMode?: ScopeMode;
      tenantContext?: TenantRequestContext;
      authContext?: AuthContext | null;
    }
  }
}

export {};
