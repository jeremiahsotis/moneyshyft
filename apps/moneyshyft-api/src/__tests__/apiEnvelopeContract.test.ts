import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { registerPlatformMiddleware } from '../api/registerRoutes';
import contractsRouter from '../routes/api/v1/platform-contracts';

const mockValidateRequest = jest.fn(() => (
  (_req: express.Request, _res: express.Response, next: express.NextFunction) => next()
));
const mockAuthenticateToken = jest.fn(
  (_req: express.Request, _res: express.Response, next: express.NextFunction) => next()
);

jest.mock('../services/AuthService', () => ({
  __esModule: true,
  default: {
    signup: jest.fn(),
    login: jest.fn(),
    getUserById: jest.fn()
  }
}));

jest.mock('../middleware/validate', () => ({
  validateRequest: () => mockValidateRequest()
}));

jest.mock('../validators/auth.validators', () => ({
  signupSchema: {},
  loginSchema: {}
}));

jest.mock('../middleware/auth', () => ({
  authenticateToken: (_req: express.Request, _res: express.Response, next: express.NextFunction) => (
    mockAuthenticateToken(_req, _res, next)
  )
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../platform/sessions/PlatformSessionStore', () => ({
  __esModule: true,
  default: {
    findSessionByRefreshToken: jest.fn(),
    rotateSession: jest.fn(),
    revokeSessionById: jest.fn(),
    revokeSessionByRefreshToken: jest.fn()
  }
}));

jest.mock('../utils/jwt', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
  verifyRefreshToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn()
}));

describe('Story 0.5 - shared API envelope and business refusal contract', () => {
  const buildApp = () => {
    const testApp = express();
    testApp.use(cookieParser());
    testApp.use(express.json());
    registerPlatformMiddleware(testApp);
    testApp.use('/api/v1/platform', contractsRouter);
    return testApp;
  };

  describe('AC1: shared envelope helpers', () => {
    it('returns canonical success envelope with code/message and request context', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/success')
        .set('x-correlation-id', 'corr-envelope-alpha')
        .send({
          code: 'ENVELOPE_SUCCESS',
          message: 'Envelope contract success',
          data: { mode: 'success' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'ENVELOPE_SUCCESS',
        message: 'Envelope contract success',
        correlationId: 'corr-envelope-alpha',
        tenantId: null,
        data: { mode: 'success' }
      });
    });

    it('ignores caller tenant header for public envelope contract probes', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/success')
        .set('x-correlation-id', 'corr-envelope-tenant-echo')
        .set('x-tenant-id', 'tenant-envelope-alpha')
        .send({
          code: 'ENVELOPE_SUCCESS',
          message: 'Envelope tenant echo contract',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        code: 'ENVELOPE_SUCCESS',
        message: 'Envelope tenant echo contract',
        correlationId: 'corr-envelope-tenant-echo',
        tenantId: null,
      });
    });

  });

  describe('AC2: business refusal contract', () => {
    it('returns HTTP 200 with ok=false and structured code/message for business refusals', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/business-refusal')
        .set('x-correlation-id', 'corr-envelope-refusal-alpha')
        .send({
          code: 'ENVELOPE_BUSINESS_REFUSAL',
          message: 'Requested amount exceeds available envelope balance',
          data: { available: 42 }
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'ENVELOPE_BUSINESS_REFUSAL',
        message: 'Requested amount exceeds available envelope balance',
        refusalType: 'business',
        correlationId: 'corr-envelope-refusal-alpha',
        tenantId: null,
        data: { available: 42 }
      });
      expect(response.body).not.toHaveProperty('stack');
    });
  });

  describe('shared system error contract helper', () => {
    it('returns error envelope with explicit error type and status', async () => {
      const app = buildApp();

      const response = await request(app)
        .post('/api/v1/platform/_kernel/contracts/envelope/system-error')
        .set('x-correlation-id', 'corr-envelope-system-alpha')
        .send({
          code: 'ENVELOPE_SYSTEM_ERROR',
          message: 'Unhandled exception while processing envelope contract',
          data: { operation: 'post-envelope' },
          httpStatus: 503
        });

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'ENVELOPE_SYSTEM_ERROR',
        message: 'Unhandled exception while processing envelope contract',
        errorType: 'system',
        correlationId: 'corr-envelope-system-alpha',
        tenantId: null,
        data: { operation: 'post-envelope' }
      });
    });
  });
});
