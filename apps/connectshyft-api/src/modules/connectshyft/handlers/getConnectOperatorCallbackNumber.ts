import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  ConnectShyftOperatorCallbackNumberPersistenceUnavailableError,
  connectShyftOperatorCallbackNumberServiceAsync,
} from '../operatorCallbackNumbers';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftOperatorCallbackNumberReadAccessContext } from '../http/telephonySettingsContext';
import { normalizeConnectShyftOperatorCallbackNumberContract } from './operatorCallbackNumberContract';

export const getConnectOperatorCallbackNumber = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftOperatorCallbackNumberReadAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  try {
    const callbackNumber = await connectShyftOperatorCallbackNumberServiceAsync.getCurrentCallbackNumber({
      tenantId: accessContext.context.tenantId,
      userId: accessContext.actorUserId,
    });

    return success(res, {
      code: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_RESOLVED',
      message: 'ConnectShyft operator callback number resolved',
      data: {
        callbackNumber: normalizeConnectShyftOperatorCallbackNumberContract(callbackNumber),
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
