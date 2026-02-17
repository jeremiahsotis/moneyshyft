import { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;
  const hasAuthenticatedCookie =
    (typeof accessToken === 'string' && accessToken.trim() !== '') ||
    (typeof refreshToken === 'string' && refreshToken.trim() !== '');

  if (!hasAuthenticatedCookie) {
    next();
    return;
  }

  const csrfCookie = req.cookies?.csrf_token;
  const csrfHeader = req.header('x-csrf-token');

  const isValidToken =
    typeof csrfCookie === 'string' &&
    csrfCookie.trim() !== '' &&
    typeof csrfHeader === 'string' &&
    csrfHeader.trim() !== '' &&
    csrfCookie === csrfHeader;

  if (!isValidToken) {
    res.status(403).json({ error: 'CSRF token missing or invalid' });
    return;
  }

  next();
};
