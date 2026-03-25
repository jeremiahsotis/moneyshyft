import { Request, Response } from 'express';
import { refusal, success } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from '../http/accessContext';
import { prepareConnectShyftConversationLaunch } from '../conversationLauncher';

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

export const postConnectConversationLauncher = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'inbox')) {
    return;
  }

  const attemptedOrgUnitId = normalizeString(req.body?.orgUnitId) || null;
  const contextDecision = await resolveConnectShyftRouteContextDecision(req, {
    attemptedOrgUnitId,
  });
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  if (!requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
  ], contextDecision.context)) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
      message: 'Thread access requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  const targetPhone = normalizeString(req.body?.targetPhone);
  if (!targetPhone) {
    refusal(res, {
      code: 'CONNECTSHYFT_CONVERSATION_LAUNCH_PHONE_REQUIRED',
      message: 'targetPhone is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return;
  }

  const prepared = await prepareConnectShyftConversationLaunch({
    actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    neighborId: normalizeString(req.body?.neighborId) || null,
    targetPhone,
    source: normalizeString(req.body?.source) || 'LAUNCHER',
    lastInboundCsNumberId: normalizeString(req.body?.lastInboundCsNumberId),
    preferredOutboundCsNumberId: normalizeString(req.body?.preferredOutboundCsNumberId),
  });

  if (!prepared.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: prepared.code,
      message: prepared.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: contextDecision.context,
      },
    });
    return;
  }

  success(res, {
    code: prepared.code,
    message: 'Conversation launcher prepared a thread.',
    httpStatus: prepared.httpStatus,
    data: prepared.data,
  });
};
