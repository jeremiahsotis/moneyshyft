import type { Response } from 'express';
import {
  buildErrorEnvelope,
  buildRefusalEnvelope,
  buildSuccessEnvelope,
  error as sharedError,
  isEnvelopePayload,
  refusal as sharedRefusal,
  replayEnvelope as sharedReplayEnvelope,
  success as sharedSuccess,
  systemError as sharedSystemError,
} from '../../../../../libs/platform/dist/envelopes/response';

export type {
  ApiEnvelopePayload,
  EnvelopeContext,
  ErrorEnvelopePayload,
  RefusalEnvelopePayload,
  SuccessEnvelopePayload,
} from '../../../../../libs/platform/dist/envelopes/response';

type SharedSuccessParams = Parameters<typeof sharedSuccess>[1];
type SharedRefusalParams = Parameters<typeof sharedRefusal>[1];
type SharedErrorParams = Parameters<typeof sharedError>[1];

export {
  buildErrorEnvelope,
  buildRefusalEnvelope,
  buildSuccessEnvelope,
  isEnvelopePayload,
};

export const success = (res: Response, params: SharedSuccessParams): Response =>
  sharedSuccess(res as never, params) as unknown as Response;

export const refusal = (res: Response, params: SharedRefusalParams): Response =>
  sharedRefusal(res as never, params) as unknown as Response;

export const error = (res: Response, params: SharedErrorParams): Response =>
  sharedError(res as never, params) as unknown as Response;

export const systemError = (res: Response, params: SharedErrorParams): Response =>
  sharedSystemError(res as never, params) as unknown as Response;

export const replayEnvelope = (res: Response, payload: unknown, httpStatus = 200): Response =>
  sharedReplayEnvelope(res as never, payload, httpStatus) as unknown as Response;
