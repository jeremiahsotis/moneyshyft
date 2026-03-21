import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import {
  buildConnectShyftNeighborIdentityMatchSuccessMessage,
  buildConnectShyftNeighborRefusalData,
  buildConnectShyftNeighborScopePayload,
  persistConnectShyftNeighborIdentityBridgeDecision,
  resolveConnectShyftNeighborIdentityMatchAccessContext,
} from '../http/neighborIdentityContext';
import { connectShyftNeighborServiceAsync } from '../neighbors';

export const postConnectNeighborIdentityMatch = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNeighborIdentityMatchAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const matched = await connectShyftNeighborServiceAsync.evaluateIdentityMatch({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    contactPoint: accessContext.payload.contactPoint,
    excludeNeighborId: accessContext.payload.excludeNeighborId || undefined,
    idempotencyKey: accessContext.payload.idempotencyKey || undefined,
    hookContext: {
      createResolverReviewOnAmbiguous: true,
      triggerSourceType: 'connectshyft_identity_match',
      requestedByUserId: accessContext.actorUserId || undefined,
    },
  });

  const identityDecision = matched.ok
    ? matched.data.identityMatch
    : matched.code === 'IDENTITY_MATCH_AMBIGUOUS' && matched.data?.identityMatch
      ? matched.data.identityMatch
      : null;

  let sideEffectsPersisted = false;
  let sideEffectsPersistenceUnavailable = false;
  if (identityDecision) {
    try {
      sideEffectsPersisted = await persistConnectShyftNeighborIdentityBridgeDecision({
        context: accessContext.context,
        actorUserId: accessContext.actorUserId,
        decision: identityDecision,
      });
    } catch (_error) {
      sideEffectsPersisted = false;
      sideEffectsPersistenceUnavailable = true;
    }
  }

  if (!matched.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: matched.code,
      message: matched.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        ...buildConnectShyftNeighborRefusalData(matched, accessContext.context),
        sideEffectsPersisted,
        sideEffectsPersistenceUnavailable,
      },
    });
    return;
  }

  return success(res, {
    code: matched.code,
    message: buildConnectShyftNeighborIdentityMatchSuccessMessage(matched.code),
    httpStatus: matched.httpStatus,
    data: {
      identityMatch: matched.data.identityMatch,
      idempotency: matched.data.idempotency,
      sideEffectsPersisted,
      sideEffectsPersistenceUnavailable,
      ...buildConnectShyftNeighborScopePayload(accessContext.context),
    },
  });
};
