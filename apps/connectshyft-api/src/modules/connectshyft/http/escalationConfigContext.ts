import { Request, Response } from 'express';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

export type ConnectShyftEscalationConfigPayload = {
  orgUnitId: string | null;
  escalationBaselineHours: unknown;
  recipients: unknown;
  defaultOperatorPhoneE164?: unknown;
};

export type ConnectShyftEscalationConfigAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
};

export type ConnectShyftEscalationConfigUpdateAccessContext =
  ConnectShyftEscalationConfigAccessContext & {
    payload: ConnectShyftEscalationConfigPayload;
  };

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseEscalationConfigBody = (req: Request): ConnectShyftEscalationConfigPayload => {
  const payload: ConnectShyftEscalationConfigPayload = {
    orgUnitId: parseOrgUnitIdFromBody(req),
    escalationBaselineHours: req.body?.escalationBaselineHours,
    recipients: req.body?.recipients,
  };

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'defaultOperatorPhoneE164')) {
    payload.defaultOperatorPhoneE164 = req.body?.defaultOperatorPhoneE164;
  }

  return payload;
};

const sendEscalationConfigForbidden = (res: Response) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
    message: 'Escalation configuration requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const resolveEscalationConfigAccessContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
): Promise<ConnectShyftEscalationConfigAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'escalation')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req, {
    attemptedOrgUnitId,
  });
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!requestHasAnyCapability(req, [CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG], contextDecision.context)) {
    sendEscalationConfigForbidden(res);
    return null;
  }

  return {
    context: contextDecision.context,
    actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
  };
};

export const resolveConnectShyftEscalationRecipientsAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftEscalationConfigAccessContext | null> =>
  resolveEscalationConfigAccessContext(req, res);

export const resolveConnectShyftEscalationConfigReadAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftEscalationConfigAccessContext | null> =>
  resolveEscalationConfigAccessContext(req, res);

export const resolveConnectShyftEscalationConfigUpdateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftEscalationConfigUpdateAccessContext | null> => {
  const payload = parseEscalationConfigBody(req);
  const accessContext = await resolveEscalationConfigAccessContext(req, res, payload.orgUnitId);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    payload,
  };
};
