import { Router, Request, Response } from 'express';
import AuthService from '../../../services/AuthService';
import { setAuthCookies, clearAuthCookies, verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../../utils/jwt';
import { validateRequest } from '../../../middleware/validate';
import { signupSchema, loginSchema } from '../../../validators/auth.validators';
import { authenticateToken } from '../../../middleware/auth';
import logger from '../../../utils/logger';
import PlatformSessionStore from '../../../platform/sessions/PlatformSessionStore';

const router = Router();

/**
 * POST /api/v1/auth/signup
 * Sign up a new user
 */
router.post('/signup', validateRequest(signupSchema), async (req: Request, res: Response) => {
  try {
    const { user, accessToken, refreshToken, invitationCode } = await AuthService.signup(req.body);

    // Set HTTP-only cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'User created successfully',
      user,
      invitationCode, // Include invitation code if household was created
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const { rememberMe = false } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.login(req.body);

    // Set HTTP-only cookies with extended duration if rememberMe is true
    setAuthCookies(res, accessToken, refreshToken, rememberMe);

    res.json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (typeof refreshToken === 'string' && refreshToken.trim() !== '') {
    try {
      await PlatformSessionStore.revokeSessionByRefreshToken(refreshToken, 'logout');
    } catch (error) {
      logger.warn('Failed to revoke refresh session on logout', { error });
    }
  }

  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Log token refresh for debugging
    logger.info('Refreshing access token', {
      userId: payload.userId,
      householdId: payload.householdId,
      hasHouseholdId: !!payload.householdId
    });

    const storedSession = await PlatformSessionStore.findSessionByRefreshToken(refreshToken);
    if (!storedSession || storedSession.revokedAt) {
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }

    if (storedSession.expiresAt.getTime() <= Date.now()) {
      await PlatformSessionStore.revokeSessionById(storedSession.id, 'expired');
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }

    const rememberMe = storedSession.rememberMe;
    const newAccessToken = generateAccessToken(payload, rememberMe);
    const newRefreshToken = generateRefreshToken(payload, rememberMe);

    await PlatformSessionStore.rotateSession(refreshToken, newRefreshToken);

    setAuthCookies(res, newAccessToken, newRefreshToken, rememberMe);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    logger.error('Token refresh error:', error);
    if (error instanceof Error && (error.message === 'SESSION_REVOKED' || error.message === 'SESSION_EXPIRED')) {
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await AuthService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
