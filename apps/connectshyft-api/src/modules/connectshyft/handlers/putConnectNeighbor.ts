import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborEditPolicyPayload,
  buildConnectShyftNeighborRefusalData,
  buildConnectShyftNeighborScopePayload,
  resolveConnectShyftNeighborUpdateAccessContext,
  updateConnectShyftNeighborWithSideEffects,
} from '../http/neighborIdentityContext';

export const putConnectNeighbor = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborUpdateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const updated = await updateConnectShyftNeighborWithSideEffects({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    neighborId: accessContext.neighborId,
    actorUserId: accessContext.actorUserId,
    firstName: accessContext.payload.firstName,
    lastName: accessContext.payload.lastName,
    prefersTexting: accessContext.payload.prefersTexting,
    phones: accessContext.payload.phones,
    policy: accessContext.policyDecision,
    provenance: accessContext.provenance,
  });

  if (!updated.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: updated.code,
      message: updated.message,
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborRefusalData(updated, accessContext.context),
    });
    return;
  }

  return success(res, {
    code: updated.code,
    message: 'Neighbor profile updated',
    httpStatus: updated.httpStatus,
    data: {
      neighbor: updated.neighbor,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
      ...buildConnectShyftNeighborEditPolicyPayload(accessContext.policyDecision),
      ...accessContext.provenance,
      sideEffectsPersisted: updated.sideEffectsPersisted,
    },
  });
};
