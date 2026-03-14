import { NextFunction, Request, Response } from 'express';
import { refusal } from '../envelopes/response';

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

  const normalizedCookie = typeof csrfCookie === 'string' ? csrfCookie.trim() : '';
  const normalizedHeader = typeof csrfHeader === 'string' ? csrfHeader.trim() : '';

  if (!normalizedCookie || !normalizedHeader) {
    refusal(res, {
      code: 'CSRF_TOKEN_REQUIRED',
      message: 'State-changing requests require CSRF header and proof token',
      refusalType: 'security',
      httpStatus: 403,
    });
    return;
  }

  if (normalizedCookie !== normalizedHeader) {
    refusal(res, {
      code: 'CSRF_TOKEN_INVALID',
      message: 'CSRF header token does not match request proof token',
      refusalType: 'security',
      httpStatus: 403,
    });
    return;
  }

  next();
};
