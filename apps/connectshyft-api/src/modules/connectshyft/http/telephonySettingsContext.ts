import { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

export type ConnectShyftTelephonySettingsAccessContext = {
  context: ResolvedConnectShyftContext;
  actorUserId: string;
  requestedProvider: string | null;
};

export type ConnectShyftOperatorCallbackNumberPayload = {
  callbackNumber: unknown;
};

export type ConnectShyftOperatorCallbackNumberUpdateAccessContext =
  ConnectShyftTelephonySettingsAccessContext & {
    payload: ConnectShyftOperatorCallbackNumberPayload;
  };

const CONNECTSHYFT_TELEPHONY_SETTINGS_CAPABILITIES = [
  CAPABILITIES.ORG_UNIT_THREAD_VIEW,
  CAPABILITIES.THREAD_VIEW_ALL,
  CAPABILITIES.ORG_UNIT_NEIGHBOR_EDIT_RELATED,
  CAPABILITIES.NEIGHBOR_EDIT_ALL,
  CAPABILITIES.TENANT_READ_ALL,
] as const;

const parseOperatorCallbackNumberBody = (
  req: Request,
): ConnectShyftOperatorCallbackNumberPayload => ({
  callbackNumber: req.body?.callbackNumber,
});

const hasConnectShyftTelephonySettingsAccess = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => requestHasAnyCapability(req, CONNECTSHYFT_TELEPHONY_SETTINGS_CAPABILITIES, context);

const sendTelephonySettingsForbidden = (
  res: Response,
  code:
    | 'CONNECTSHYFT_TELEPHONY_READINESS_FORBIDDEN'
    | 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_FORBIDDEN',
  message: string,
) => {
  sendConnectShyftRouteRefusal(res, {
    code,
    message,
    refusalType: 'business',
    httpStatus: 200,
  });
};

const sendTelephonySettingsActorContextRequired = (
  res: Response,
  surface: 'telephony_readiness' | 'operator_callback_number',
) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
    message: 'Telephony settings require an authenticated operator context.',
    refusalType: 'business',
    httpStatus: 200,
    data: {
      surface,
    },
  });
};

const resolveTelephonySettingsAccessContext = async (
  req: Request,
  res: Response,
  input: {
    forbiddenCode:
      | 'CONNECTSHYFT_TELEPHONY_READINESS_FORBIDDEN'
      | 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_FORBIDDEN';
    forbiddenMessage: string;
    actorContextSurface: 'telephony_readiness' | 'operator_callback_number';
  },
): Promise<ConnectShyftTelephonySettingsAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!hasConnectShyftTelephonySettingsAccess(req, contextDecision.context)) {
    sendTelephonySettingsForbidden(res, input.forbiddenCode, input.forbiddenMessage);
    return null;
  }

  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  if (!actorUserId) {
    sendTelephonySettingsActorContextRequired(res, input.actorContextSurface);
    return null;
  }

  return {
    context: contextDecision.context,
    actorUserId,
    requestedProvider: resolveConnectShyftRequestedProviderKey(req),
  };
};

export const resolveConnectShyftTelephonyReadinessAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftTelephonySettingsAccessContext | null> =>
  resolveTelephonySettingsAccessContext(req, res, {
    forbiddenCode: 'CONNECTSHYFT_TELEPHONY_READINESS_FORBIDDEN',
    forbiddenMessage:
      'Telephony readiness requires an authorized ConnectShyft operator with active orgUnit access.',
    actorContextSurface: 'telephony_readiness',
  });

export const resolveConnectShyftOperatorCallbackNumberReadAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftTelephonySettingsAccessContext | null> =>
  resolveTelephonySettingsAccessContext(req, res, {
    forbiddenCode: 'CONNECTSHYFT_OPERATOR_CALLBACK_NUMBER_FORBIDDEN',
    forbiddenMessage:
      'Callback number management requires an authorized ConnectShyft operator with active orgUnit access.',
    actorContextSurface: 'operator_callback_number',
  });

export const resolveConnectShyftOperatorCallbackNumberUpdateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftOperatorCallbackNumberUpdateAccessContext | null> => {
  const accessContext = await resolveConnectShyftOperatorCallbackNumberReadAccessContext(req, res);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    payload: parseOperatorCallbackNumberBody(req),
  };
};
