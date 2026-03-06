import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import logger from '../utils/logger';

/**
 * Authentication middleware
 * Verifies JWT token from cookies and attaches user info to request
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies.access_token;

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
}

/**
 * Authorization middleware - check if user has required role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Household access middleware - ensure user belongs to the household
 */
export function requireHouseholdAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.householdId) {
    res.status(403).json({ error: 'No household assigned to this user' });
    return;
  }

  next();
}
