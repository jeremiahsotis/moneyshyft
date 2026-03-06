import crypto from 'crypto';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { CookieOptions, Response } from 'express';

export interface JWTPayload {
  userId: string;
  email: string;
  householdId: string | null;
  activeTenantId?: string | null;
  activeOrgUnitId?: string | null;
  mustResetPassword?: boolean;
  role: string;
}

const sanitizeJwtPayload = (decoded: JwtPayload | string): JWTPayload => {
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  const userId = typeof decoded.userId === 'string' ? decoded.userId : null;
  const email = typeof decoded.email === 'string' ? decoded.email : null;
  const role = typeof decoded.role === 'string' ? decoded.role : null;

  if (!userId || !email || !role) {
    throw new Error('Invalid token payload');
  }

  return {
    userId,
    email,
    householdId: typeof decoded.householdId === 'string' ? decoded.householdId : null,
    activeTenantId: typeof decoded.activeTenantId === 'string'
      ? decoded.activeTenantId
      : typeof decoded.householdId === 'string'
        ? decoded.householdId
        : null,
    activeOrgUnitId: typeof decoded.activeOrgUnitId === 'string' ? decoded.activeOrgUnitId : null,
    mustResetPassword: decoded.mustResetPassword === true,
    role,
  };
};

const resolveRequiredSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (process.env.NODE_ENV === 'test') {
    return `test-${name.toLowerCase()}`;
  }

  throw new Error(`${name} must be set via environment/secret manager`);
};

const resolveJwtSecret = (): string => resolveRequiredSecret('JWT_SECRET');
const resolveJwtRefreshSecret = (): string => resolveRequiredSecret('JWT_REFRESH_SECRET');

// Session duration constants
const SHORT_SESSION_ACCESS = '2h';
const SHORT_SESSION_REFRESH = '7d';
const EXTENDED_SESSION_ACCESS = '7d';  // Extended access token
const EXTENDED_SESSION_REFRESH = '30d'; // Extended refresh token

type CookiePolicy = {
  authCookie: CookieOptions;
  csrfCookie: CookieOptions;
};

const resolveCookieDomain = (): string | undefined => {
  const configuredDomain = process.env.COOKIE_DOMAIN?.trim();
  if (!configuredDomain) {
    return undefined;
  }

  return configuredDomain.startsWith('.') ? configuredDomain : `.${configuredDomain}`;
};

const getCookiePolicy = (): CookiePolicy => {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = isProduction ? resolveCookieDomain() : undefined;

  const authCookie: CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };

  const csrfCookie: CookieOptions = {
    path: '/',
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };

  if (domain) {
    authCookie.domain = domain;
    csrfCookie.domain = domain;
  }

  return { authCookie, csrfCookie };
};

const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

/**
 * Generate access token (short-lived or extended based on rememberMe)
 */
export function generateAccessToken(payload: JWTPayload, rememberMe: boolean = false): string {
  const expiresIn = rememberMe ? EXTENDED_SESSION_ACCESS : SHORT_SESSION_ACCESS;
  return jwt.sign(payload, resolveJwtSecret(), { expiresIn });
}

/**
 * Generate refresh token (long-lived or extended based on rememberMe)
 */
export function generateRefreshToken(payload: JWTPayload, rememberMe: boolean = false): string {
  const expiresIn = rememberMe ? EXTENDED_SESSION_REFRESH : SHORT_SESSION_REFRESH;
  return jwt.sign(payload, resolveJwtRefreshSecret(), {
    expiresIn,
    jwtid: crypto.randomUUID(),
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, resolveJwtSecret()) as JwtPayload | string;
    return sanitizeJwtPayload(decoded);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, resolveJwtRefreshSecret()) as JwtPayload | string;
    return sanitizeJwtPayload(decoded);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Set auth cookies on response
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, rememberMe: boolean = false): void {
  const { authCookie, csrfCookie } = getCookiePolicy();
  const csrfToken = generateCsrfToken();

  // Calculate maxAge based on rememberMe
  const accessMaxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
    : 2 * 60 * 60 * 1000;       // 2 hours in milliseconds

  const refreshMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds
    : 7 * 24 * 60 * 60 * 1000;  // 7 days in milliseconds

  // Access token cookie (HTTP-only, secure in production)
  res.cookie('access_token', accessToken, {
    maxAge: accessMaxAge,
    ...authCookie,
  });

  // Refresh token cookie (HTTP-only, secure in production)
  res.cookie('refresh_token', refreshToken, {
    maxAge: refreshMaxAge,
    ...authCookie,
  });

  // CSRF cookie (readable by browser JS for double-submit validation)
  res.cookie('csrf_token', csrfToken, {
    maxAge: refreshMaxAge,
    ...csrfCookie,
  });
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(res: Response): void {
  const { authCookie, csrfCookie } = getCookiePolicy();

  res.clearCookie('access_token', { ...authCookie });
  res.clearCookie('refresh_token', { ...authCookie });
  res.clearCookie('csrf_token', { ...csrfCookie });
}
