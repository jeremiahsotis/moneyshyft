import { Request, Response } from 'express';
import { ACTIVITY_STATUSES, type ActivityStatus } from '../../peoplecore/activity';
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

const parseStatus = (value: unknown): ActivityStatus | undefined | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  if (!ACTIVITY_STATUSES.includes(normalized as ActivityStatus)) {
    return null;
  }

  return normalized as ActivityStatus;
};

const respondInvalidField = (
  res: Response,
  input: {
    code: string;
    field: string;
    message: string;
    reason?: string;
  },
) => refusal(res, {
  code: input.code,
  message: input.message,
  refusalType: 'client',
  httpStatus: 400,
  data: {
    fieldErrors: [
      {
        field: input.field,
        reason: input.reason ?? 'INVALID',
        message: input.message,
      },
    ],
  },
});

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

export const postPersonActivityHandler = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const personId = normalizeString(req.params?.personId);
  if (!UUID_PATTERN.test(personId)) {
    respondInvalidField(res, {
      code: 'CONNECTSHYFT_PERSON_ID_INVALID',
      field: 'personId',
      message: 'personId must be a non-empty UUID.',
    });
    return;
  }

  const activityType = normalizeString(req.body?.type);
  if (!activityType) {
    respondInvalidField(res, {
      code: 'CONNECTSHYFT_ACTIVITY_TYPE_REQUIRED',
      field: 'type',
      message: 'type is required.',
      reason: 'REQUIRED',
    });
    return;
  }

  const status = parseStatus(req.body?.status);
  if (status === null) {
    respondInvalidField(res, {
      code: 'CONNECTSHYFT_ACTIVITY_STATUS_INVALID',
      field: 'status',
      message: 'status must be ACTIVE, COMPLETED, or CANCELLED.',
    });
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  try {
    const activity = await connectShyftActivityServiceAsync.createPersonActivity({
      actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
      tenantId: contextDecision.context.tenantId,
      orgUnitId: contextDecision.context.orgUnitId,
      personId,
      type: activityType,
      status,
    });

    return success(res, {
      code: 'CONNECTSHYFT_ACTIVITY_CREATED',
      message: 'ConnectShyft activity created',
      httpStatus: 201,
      data: {
        activity,
      },
    });
  } catch (error) {
    if (!(error instanceof ConnectShyftActivityServiceError)) {
      throw error;
    }

    respondActivityError(res, error);
  }
};
