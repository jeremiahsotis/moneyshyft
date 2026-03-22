import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  ConnectShyftOperatorCallbackNumberPersistenceUnavailableError,
  connectShyftOperatorCallbackNumberServiceAsync,
} from '../operatorCallbackNumbers';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftOperatorCallbackNumberUpdateAccessContext } from '../http/telephonySettingsContext';
import { normalizeConnectShyftOperatorCallbackNumberContract } from './operatorCallbackNumberContract';

export const putConnectOperatorCallbackNumber = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftOperatorCallbackNumberUpdateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  try {
    const saved = await connectShyftOperatorCallbackNumberServiceAsync.setCallbackNumber({
      tenantId: accessContext.context.tenantId,
      userId: accessContext.actorUserId,
      callbackNumber: accessContext.payload.callbackNumber,
    });

    if (!saved.ok) {
      sendConnectShyftRouteRefusal(res, {
        code: saved.code,
        message: saved.message,
        refusalType: 'business',
        httpStatus: 200,
        data: saved.data,
      });
      return;
    }

    return success(res, {
      code: saved.code,
      message: 'ConnectShyft operator callback number saved',
      httpStatus: saved.httpStatus,
      data: {
        callbackNumber: normalizeConnectShyftOperatorCallbackNumberContract(
          saved.data.callbackNumber,
        ),
      },
    });
  } catch (error) {
    if (!(error instanceof ConnectShyftOperatorCallbackNumberPersistenceUnavailableError)) {
      throw error;
    }

    sendConnectShyftRouteRefusal(res, {
      code: error.code,
      message: 'Operator callback number storage is temporarily unavailable.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        orgUnitId: accessContext.context.orgUnitId,
      },
    });
  }
};
