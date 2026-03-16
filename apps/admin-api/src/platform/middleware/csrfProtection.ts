import type { RequestHandler } from 'express';
import { csrfProtection as sharedCsrfProtection } from '../../../../../libs/platform/dist/middleware/csrfProtection';

export const csrfProtection: RequestHandler = sharedCsrfProtection as unknown as RequestHandler;
