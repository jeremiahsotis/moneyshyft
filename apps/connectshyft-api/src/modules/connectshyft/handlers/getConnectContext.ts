import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { connectShyftTelephonyReadinessServiceAsync } from '../telephonyReadiness';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
import {
  resolveEntitlementAwareConnectShyftFlags,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  resolveConnectShyftShellOrgUnits,
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
  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  const flagsResult = await resolveEntitlementAwareConnectShyftFlags(req);
  const shellOrgUnits = await resolveConnectShyftShellOrgUnits(
    req,
    contextDecision.context,
    flagsResult,
  );
  const activeShellOrgUnit = shellOrgUnits.find(
    (orgUnit) => orgUnit.id === contextDecision.context.orgUnitId,
  );
  const connectModuleAvailable = activeShellOrgUnit?.availableModules.connect === true;
  const readiness = connectModuleAvailable
    ? await connectShyftTelephonyReadinessServiceAsync.inspectReadiness({
      tenantId: contextDecision.context.tenantId,
      orgUnitId: contextDecision.context.orgUnitId,
      userId: resolveConnectShyftRequestedActorUserId(req) || '',
      requestedProvider: resolveConnectShyftRequestedProviderKey(req),
      providerRegistryHeaders: resolveProviderRegistryHeaders(req),
    })
    : {
      operatorPhoneSource: null,
      voiceReady: false,
      smsReady: false,
      degradedMode: false,
    };

  return success(res, {
    code: 'CONNECTSHYFT_CONTEXT_RESOLVED',
    message: 'ConnectShyft context resolved',
    data: {
      context: {
        tenantId: contextDecision.context.tenantId,
        orgUnitId: contextDecision.context.orgUnitId,
        bypassedOrgUnitMembership: contextDecision.context.bypassedOrgUnitMembership,
        orgUnits: shellOrgUnits,
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
