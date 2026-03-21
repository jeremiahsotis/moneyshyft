import { Request, Response } from 'express';
import { refusal } from '../../../platform/envelopes/response';
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

export type ConnectShyftNumberMappingPayload = {
  orgUnitId: string | null;
  isActive: boolean;
  providerNumberE164: string;
  label: string;
};

export type ConnectShyftNumberMappingListAccessContext = {
  context: ResolvedConnectShyftContext;
};

export type ConnectShyftNumberMappingCreateAccessContext = {
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
  payload: ConnectShyftNumberMappingPayload;
};

export type ConnectShyftNumberMappingUpdateAccessContext =
  ConnectShyftNumberMappingCreateAccessContext & {
    mappingId: string;
  };

const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
};

const parseOrgUnitIdFromBody = (req: Request): string | null => {
  if (typeof req.body?.orgUnitId !== 'string') {
    return null;
  }

  const normalized = req.body.orgUnitId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseMappingBody = (req: Request): ConnectShyftNumberMappingPayload => ({
  orgUnitId: parseOrgUnitIdFromBody(req),
  // Preserve explicit false values from JSON/string payloads instead of truthy coercion.
  isActive: parseOptionalBoolean(req.body?.isActive) ?? true,
  providerNumberE164: typeof req.body?.providerNumberE164 === 'string'
    ? req.body.providerNumberE164
    : (typeof req.body?.twilioNumberE164 === 'string' ? req.body.twilioNumberE164 : ''),
  label: typeof req.body?.label === 'string' ? req.body.label : '',
});

const sendNumberMappingForbidden = (res: Response) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
    message: 'Number mapping management requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const resolveNumberMappingAccessContext = async (
  req: Request,
  res: Response,
  attemptedOrgUnitId?: string | null,
): Promise<{
  context: ResolvedConnectShyftContext;
  actorRoles: string[];
} | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req, {
    attemptedOrgUnitId,
  });
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!requestHasAnyCapability(req, [CAPABILITIES.NUMBER_MAPPING_MANAGE], contextDecision.context)) {
    sendNumberMappingForbidden(res);
    return null;
  }

  return {
    context: contextDecision.context,
    actorRoles: resolveConnectShyftActorRoles(req, contextDecision.context),
  };
};

export const resolveConnectShyftNumberMappingListAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNumberMappingListAccessContext | null> => {
  const accessContext = await resolveNumberMappingAccessContext(req, res);
  if (!accessContext) {
    return null;
  }

  return {
    context: accessContext.context,
  };
};

export const resolveConnectShyftNumberMappingCreateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNumberMappingCreateAccessContext | null> => {
  const payload = parseMappingBody(req);
  const accessContext = await resolveNumberMappingAccessContext(req, res, payload.orgUnitId);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    payload,
  };
};

export const resolveConnectShyftNumberMappingUpdateAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftNumberMappingUpdateAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return null;
  }

  const mappingId = typeof req.params.mappingId === 'string' ? req.params.mappingId.trim() : '';
  if (!mappingId) {
    refusal(res, {
      code: 'CONNECTSHYFT_NUMBER_MAPPING_ID_REQUIRED',
      message: 'mappingId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  const payload = parseMappingBody(req);
  const accessContext = await resolveNumberMappingAccessContext(req, res, payload.orgUnitId);
  if (!accessContext) {
    return null;
  }

  return {
    ...accessContext,
    mappingId,
    payload,
  };
};
