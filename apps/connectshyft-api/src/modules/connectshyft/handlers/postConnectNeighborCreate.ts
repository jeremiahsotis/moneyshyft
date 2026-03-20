import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborRefusalData,
  buildConnectShyftNeighborScopePayload,
  resolveConnectShyftNeighborCreateAccessContext,
} from '../http/neighborIdentityContext';
import { connectShyftNeighborServiceAsync } from '../neighbors';

export const postConnectNeighborCreate = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborCreateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const created = await connectShyftNeighborServiceAsync.createNeighbor({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    firstName: accessContext.payload.firstName,
    lastName: accessContext.payload.lastName,
    prefersTexting: accessContext.payload.prefersTexting,
    phones: accessContext.payload.phones,
  });

  if (!created.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: created.code,
      message: created.message,
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborRefusalData(created, accessContext.context),
    });
    return;
  }

  return success(res, {
    code: created.code,
    message: 'Neighbor created',
    httpStatus: created.httpStatus,
    data: {
      neighborId: created.data.neighbor.neighborId,
      neighbor: created.data.neighbor,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
    },
  });
};
