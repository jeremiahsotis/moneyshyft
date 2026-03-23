import { Request, Response } from 'express';
import {
  error as errorEnvelope,
  refusal,
  success,
} from '../../../platform/envelopes/response';
import {
  ConnectShyftActivityServiceError,
  connectShyftActivityServiceAsync,
} from '../activities';
import {
  enforceConnectShyftCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../http/accessContext';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const respondActivityError = (res: Response, error: ConnectShyftActivityServiceError) => {
  if (error.httpStatus >= 500) {
    return errorEnvelope(res, {
      code: error.code,
      message: error.message,
      httpStatus: error.httpStatus,
    });
  }

  return refusal(res, {
    code: error.code,
    message: error.message,
    refusalType: error.refusalType,
    httpStatus: error.httpStatus,
  });
};

export const getActivityThreadsHandler = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const activityId = normalizeString(req.params?.activityId);
  if (!UUID_PATTERN.test(activityId)) {
    refusal(res, {
      code: 'CONNECTSHYFT_ACTIVITY_ID_INVALID',
      message: 'activityId must be a non-empty UUID.',
      refusalType: 'client',
      httpStatus: 400,
      data: {
        fieldErrors: [
          {
            field: 'activityId',
            reason: 'INVALID',
            message: 'activityId must be a non-empty UUID.',
          },
        ],
      },
    });
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  try {
    const threads = await connectShyftActivityServiceAsync.listActivityThreads({
      actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
      tenantId: contextDecision.context.tenantId,
      orgUnitId: contextDecision.context.orgUnitId,
      activityId,
    });

    return success(res, {
      code: 'CONNECTSHYFT_ACTIVITY_THREADS_LISTED',
      message: 'ConnectShyft activity threads listed',
      httpStatus: 200,
      data: {
        threads,
      },
    });
  } catch (error) {
    if (!(error instanceof ConnectShyftActivityServiceError)) {
      throw error;
    }

    respondActivityError(res, error);
  }
};
