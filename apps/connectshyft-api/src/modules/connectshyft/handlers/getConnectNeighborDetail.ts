import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborEditPolicyPayload,
  buildConnectShyftNeighborRefusalData,
  buildConnectShyftNeighborScopePayload,
  resolveConnectShyftNeighborDetailAccessContext,
} from '../http/neighborIdentityContext';
import { connectShyftNeighborServiceAsync } from '../neighbors';

export const getConnectNeighborDetail = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborDetailAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const resolved = await connectShyftNeighborServiceAsync.resolveNeighbor({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    neighborId: accessContext.neighborId,
    includeDeleted: accessContext.includeDeleted,
  });

  if (!resolved.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: resolved.code,
      message: resolved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborRefusalData(resolved, accessContext.context),
    });
    return;
  }

  return success(res, {
    code: resolved.code,
    message: 'Neighbor resolved',
    httpStatus: resolved.httpStatus,
    data: {
      neighbor: resolved.data.neighbor,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
      ...buildConnectShyftNeighborEditPolicyPayload(accessContext.policyDecision),
    },
  });
};
