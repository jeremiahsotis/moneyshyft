import { JWTPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      role: string;
      householdId: string | null;
    }

    interface Request {
      user?: JWTPayload;
      correlationId?: string;
      tenantId?: string;
      authContext?: AuthContext | null;
    }
  }
}

export {};
