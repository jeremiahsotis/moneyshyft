import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborScopePayload,
  resolveConnectShyftNeighborDeleteAccessContext,
  softDeleteConnectShyftNeighborWithSideEffects,
} from '../http/neighborIdentityContext';

export const deleteConnectNeighbor = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborDeleteAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const deleted = await softDeleteConnectShyftNeighborWithSideEffects({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    neighborId: accessContext.neighborId,
    actorUserId: accessContext.actorUserId,
    irreversibleConfirmation: accessContext.payload.irreversibleConfirmation,
  });

  if (!deleted.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: deleted.code,
      message: deleted.message,
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborScopePayload(accessContext.context),
    });
    return;
  }

  return success(res, {
    code: deleted.code,
    message: deleted.alreadyDeleted ? 'Neighbor already soft-deleted' : 'Neighbor soft-deleted',
    httpStatus: deleted.httpStatus,
    data: {
      neighborId: accessContext.neighborId,
      neighbor: deleted.neighbor,
      alreadyDeleted: deleted.alreadyDeleted,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
      audit: deleted.provenance?.audit || null,
      outbox: deleted.provenance?.outbox || null,
      sideEffectsPersisted: deleted.sideEffectsPersisted,
    },
  });
};
