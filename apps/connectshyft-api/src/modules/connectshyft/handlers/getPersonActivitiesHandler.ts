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

export const getPersonActivitiesHandler = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const personId = normalizeString(req.params?.personId);
  if (!UUID_PATTERN.test(personId)) {
    refusal(res, {
      code: 'CONNECTSHYFT_PERSON_ID_INVALID',
      message: 'personId must be a non-empty UUID.',
      refusalType: 'client',
      httpStatus: 400,
      data: {
        fieldErrors: [
          {
            field: 'personId',
            reason: 'INVALID',
            message: 'personId must be a non-empty UUID.',
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
    const activities = await connectShyftActivityServiceAsync.listPersonActivities({
      actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
      tenantId: contextDecision.context.tenantId,
      orgUnitId: contextDecision.context.orgUnitId,
      personId,
    });

    return success(res, {
      code: 'CONNECTSHYFT_PERSON_ACTIVITIES_LISTED',
      message: 'ConnectShyft person activities listed',
      httpStatus: 200,
      data: {
        activities,
      },
    });
  } catch (error) {
    if (!(error instanceof ConnectShyftActivityServiceError)) {
      throw error;
    }

    respondActivityError(res, error);
  }
};
