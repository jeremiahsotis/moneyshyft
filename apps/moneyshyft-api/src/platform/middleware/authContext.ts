import type { RequestHandler } from 'express';
import { authContext as sharedAuthContext } from '../../../../../libs/platform/dist/middleware/authContext';

export const authContext: RequestHandler = sharedAuthContext as unknown as RequestHandler;
