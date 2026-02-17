import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

const mockFindSessionByRefreshToken = jest.fn();
const mockRotateSession = jest.fn();
const mockVerifyRefreshToken = jest.fn();
const mockGenerateAccessToken = jest.fn();
const mockGenerateRefreshToken = jest.fn();
const mockSetAuthCookies = jest.fn();

jest.mock('../../../../services/AuthService', () => ({
  __esModule: true,
  default: {
    signup: jest.fn(),
    login: jest.fn(),
    getUserById: jest.fn(),
  },
}));

jest.mock('../../../../middleware/validate', () => ({
  validateRequest: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../../../validators/auth.validators', () => ({
  signupSchema: {},
  loginSchema: {},
}));

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock('../../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../platform/sessions/PlatformSessionStore', () => ({
  __esModule: true,
  default: {
    findSessionByRefreshToken: (...args: unknown[]) => mockFindSessionByRefreshToken(...args),
    rotateSession: (...args: unknown[]) => mockRotateSession(...args),
    revokeSessionById: jest.fn(),
    revokeSessionByRefreshToken: jest.fn(),
  },
}));

jest.mock('../../../../utils/jwt', () => ({
  verifyRefreshToken: (...args: unknown[]) => mockVerifyRefreshToken(...args),
  generateAccessToken: (...args: unknown[]) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args: unknown[]) => mockGenerateRefreshToken(...args),
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
  clearAuthCookies: jest.fn(),
}));

import authRouter from '../auth';

const buildApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/v1/auth', authRouter);
  return app;
};

const refreshPayload = {
  userId: 'user-123',
  email: 'user-123@example.com',
  householdId: 'house-123',
  role: 'member',
};

const activeSession = (overrides?: Partial<{ revokedAt: Date | null; rememberMe: boolean }>) => ({
  id: 'session-1',
  userId: 'user-123',
  householdId: 'house-123',
  refreshTokenHash: 'hash-1',
  rememberMe: overrides?.rememberMe ?? false,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: overrides?.revokedAt ?? null,
  revokedReason: null,
  rotatedToSessionId: null,
  lastUsedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('auth refresh route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyRefreshToken.mockReturnValue(refreshPayload);
    mockGenerateAccessToken.mockReturnValue('access-next');
    mockGenerateRefreshToken.mockReturnValue('refresh-next');
  });

  it('rejects replayed refresh token reuse after a successful rotation', async () => {
    const app = buildApp();
    let rotated = false;

    mockFindSessionByRefreshToken.mockImplementation(async () =>
      activeSession({ revokedAt: rotated ? new Date() : null })
    );
    mockRotateSession.mockImplementation(async () => {
      if (rotated) {
        throw new Error('SESSION_REVOKED');
      }
      rotated = true;
      return activeSession();
    });

    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=refresh-old']);
    const replayRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=refresh-old']);

    expect(firstRefresh.status).toBe(200);
    expect(firstRefresh.body.message).toBe('Token refreshed successfully');
    expect(replayRefresh.status).toBe(403);
    expect(replayRefresh.body.error).toBe('Refresh token rejected');
    expect(mockRotateSession).toHaveBeenCalledTimes(1);
    expect(mockSetAuthCookies).toHaveBeenCalledTimes(1);
  });

  it('rejects refresh when session is already revoked in storage', async () => {
    const app = buildApp();
    mockFindSessionByRefreshToken.mockResolvedValue(activeSession({ revokedAt: new Date() }));

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=refresh-revoked']);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Refresh token rejected');
    expect(mockRotateSession).not.toHaveBeenCalled();
  });
});
