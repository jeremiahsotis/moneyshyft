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
    activeTenantId: typeof decoded.activeTenantId === 'string' ? decoded.activeTenantId : null,
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

const SHORT_SESSION_ACCESS = '2h';
const SHORT_SESSION_REFRESH = '7d';
const EXTENDED_SESSION_ACCESS = '7d';
const EXTENDED_SESSION_REFRESH = '30d';

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

export function generateAccessToken(payload: JWTPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? EXTENDED_SESSION_ACCESS : SHORT_SESSION_ACCESS;
  return jwt.sign(payload, resolveJwtSecret(), { expiresIn } as SignOptions);
}

export function generateRefreshToken(payload: JWTPayload, rememberMe = false): string {
  const expiresIn = rememberMe ? EXTENDED_SESSION_REFRESH : SHORT_SESSION_REFRESH;
  return jwt.sign(payload, resolveJwtRefreshSecret(), {
    expiresIn,
    jwtid: crypto.randomUUID(),
  } as SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, resolveJwtSecret()) as JwtPayload | string;
    return sanitizeJwtPayload(decoded);
  } catch (_error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, resolveJwtRefreshSecret()) as JwtPayload | string;
    return sanitizeJwtPayload(decoded);
  } catch (_error) {
    throw new Error('Invalid or expired refresh token');
  }
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe = false
): void {
  const { authCookie, csrfCookie } = getCookiePolicy();
  const csrfToken = generateCsrfToken();

  const accessMaxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000
    : 2 * 60 * 60 * 1000;

  const refreshMaxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  res.cookie('access_token', accessToken, {
    maxAge: accessMaxAge,
    ...authCookie,
  });

  res.cookie('refresh_token', refreshToken, {
    maxAge: refreshMaxAge,
    ...authCookie,
  });

  res.cookie('csrf_token', csrfToken, {
    maxAge: refreshMaxAge,
    ...csrfCookie,
  });
}

export function clearAuthCookies(res: Response): void {
  const { authCookie, csrfCookie } = getCookiePolicy();

  res.clearCookie('access_token', { ...authCookie });
  res.clearCookie('refresh_token', { ...authCookie });
  res.clearCookie('csrf_token', { ...csrfCookie });
}
