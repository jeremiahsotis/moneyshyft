import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { connectShyftTelephonyReadinessServiceAsync } from '../telephonyReadiness';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
import {
  enforceConnectShyftCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
} from '../http/accessContext';

const resolveProviderRegistryHeaders = (
  req: Request,
): Record<string, string | undefined> => Object.fromEntries(
  Object.entries(req.headers).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value[0]
      : typeof value === 'string'
        ? value
        : undefined,
  ]),
);

export const getConnectContext = async (req: Request, res: Response) => {
  if (!await enforceConnectShyftCapability(req, res, 'module')) {
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  const readiness = await connectShyftTelephonyReadinessServiceAsync.inspectReadiness({
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    userId: resolveConnectShyftRequestedActorUserId(req) || '',
    requestedProvider: resolveConnectShyftRequestedProviderKey(req),
    providerRegistryHeaders: resolveProviderRegistryHeaders(req),
  });

  return success(res, {
    code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
    message: 'ConnectShyft context resolved',
    data: {
      context: {
        tenantId: contextDecision.context.tenantId,
        orgUnitId: contextDecision.context.orgUnitId,
        bypassedOrgUnitMembership: contextDecision.context.bypassedOrgUnitMembership,
        telephony: {
          operatorPhoneSource: readiness.operatorPhoneSource,
          voiceReady: readiness.voiceReady,
          smsReady: readiness.smsReady,
          degradedMode: readiness.degradedMode,
        },
      },
    },
  });
};
