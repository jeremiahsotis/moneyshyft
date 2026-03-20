import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborRefusalData,
  buildConnectShyftNeighborScopePayload,
  resolveConnectShyftNeighborListAccessContext,
} from '../http/neighborIdentityContext';
import { connectShyftNeighborServiceAsync } from '../neighbors';

export const getConnectNeighbors = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborListAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const resolved = await connectShyftNeighborServiceAsync.listNeighbors({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
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
    message: 'Neighbors resolved',
    httpStatus: resolved.httpStatus,
    data: {
      neighbors: resolved.data.neighbors,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
    },
  });
};
