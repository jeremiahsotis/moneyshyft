import { Request, Response } from 'express';
import { refusal, success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborMergeProvenancePayload,
  buildConnectShyftNeighborScopePayload,
  mergeConnectShyftNeighborsWithSideEffects,
  resolveConnectShyftNeighborMergeAccessContext,
} from '../http/neighborIdentityContext';

export const postConnectNeighborMerge = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborMergeAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  if (!accessContext.payload.sourceNeighborId || !accessContext.payload.survivorNeighborId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NEIGHBOR_MERGE_INVALID',
      message: 'sourceNeighborId and survivorNeighborId are required.',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const provenance = buildConnectShyftNeighborMergeProvenancePayload(
    accessContext.context,
    accessContext.actorUserId,
    accessContext.payload.sourceNeighborId,
    accessContext.payload.survivorNeighborId,
    accessContext.payload.reason,
  );

  const merged = await mergeConnectShyftNeighborsWithSideEffects({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    sourceNeighborId: accessContext.payload.sourceNeighborId,
    survivorNeighborId: accessContext.payload.survivorNeighborId,
    actorUserId: accessContext.actorUserId,
    irreversibleConfirmation: accessContext.payload.irreversibleConfirmation,
    reason: accessContext.payload.reason,
    simulateFailureStage: accessContext.payload.simulateFailureStage,
    provenance,
  });

  if (!merged.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: merged.code,
      message: merged.message,
      refusalType: 'business',
      httpStatus: 200,
      data: buildConnectShyftNeighborScopePayload(accessContext.context),
    });
    return;
  }

  return success(res, {
    code: merged.code,
    message: 'Neighbor merge complete',
    httpStatus: merged.httpStatus,
    data: {
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
      merge: merged.merge,
      audit: provenance.audit,
      outbox: provenance.outbox,
      sideEffectsPersisted: merged.sideEffectsPersisted,
    },
  });
};
