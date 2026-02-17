import { NextFunction, Request, Response } from 'express';
import { pushPlatformChainStep } from './responseEnvelope';

export const authContext = (req: Request, _res: Response, next: NextFunction): void => {
  req.authContext = req.user
    ? {
      userId: req.user.userId,
      role: req.user.role,
      householdId: req.user.householdId || null
    }
    : null;

  pushPlatformChainStep(_res, 'auth-context');
  next();
};
