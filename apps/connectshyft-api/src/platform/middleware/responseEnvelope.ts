import type { RequestHandler } from 'express';
import {
  pushPlatformChainStep as sharedPushPlatformChainStep,
  responseEnvelope as sharedResponseEnvelope,
} from '../../../../../libs/platform/dist/middleware/responseEnvelope';

export const responseEnvelope: RequestHandler = sharedResponseEnvelope as unknown as RequestHandler;
export const pushPlatformChainStep = sharedPushPlatformChainStep;
