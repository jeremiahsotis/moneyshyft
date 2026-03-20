import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  enforceConnectShyftCapability,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../http/accessContext';

export const getConnectContext = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
    message: 'ConnectShyft context resolved',
    data: {
      context: {
        tenantId: contextDecision.context.tenantId,
        orgUnitId: contextDecision.context.orgUnitId,
        bypassedOrgUnitMembership: contextDecision.context.bypassedOrgUnitMembership,
      },
    },
  });
};
