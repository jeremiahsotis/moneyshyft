import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import { evaluateConnectShyftCapability } from '../featureFlags';
import { connectShyftTelephonyReadinessServiceAsync } from '../telephonyReadiness';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
import {
  requestHasAnyCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveEntitlementAwareConnectShyftFlags,
  resolveConnectShyftRouteContextDecision,
  sendConnectShyftRouteRefusal,
} from '../http/accessContext';
import type { ResolvedConnectShyftContext } from '../contextAccess';

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

const canAccessConnectShyftAdminSettingsByCapability = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => requestHasAnyCapability(req, [
  CAPABILITIES.NUMBER_MAPPING_MANAGE,
  CAPABILITIES.ORG_UNIT_ESCALATION_CONFIG,
  CAPABILITIES.MODULE_ENTITLEMENT_MANAGE,
  CAPABILITIES.TENANT_ROLE_ASSIGN,
  CAPABILITIES.ORG_UNIT_ADMIN_ASSIGN,
], context);

const buildConnectShyftAvailabilityPayload = (input: {
  flags: Awaited<ReturnType<typeof resolveEntitlementAwareConnectShyftFlags>>['flags'];
  entitlementDecision: Awaited<ReturnType<typeof resolveEntitlementAwareConnectShyftFlags>>['entitlementDecision'];
  telephonyReadiness?: {
    voiceReady: boolean;
    smsReady: boolean;
    degradedMode: boolean;
    blockingReasonCount: number;
  };
}) => ({
  flags: input.flags,
  entitlement: input.entitlementDecision
    ? {
      moduleKey: input.entitlementDecision.moduleKey,
      enabled: input.entitlementDecision.enabled,
      reason: input.entitlementDecision.reason,
    }
    : null,
  capabilities: {
    module: evaluateConnectShyftCapability(input.flags, 'module').ok,
    inbox: evaluateConnectShyftCapability(input.flags, 'inbox').ok,
    escalation: evaluateConnectShyftCapability(input.flags, 'escalation').ok,
    webhooks: evaluateConnectShyftCapability(input.flags, 'webhooks').ok,
  },
  ...(input.telephonyReadiness
    ? {
      telephonyReadiness: input.telephonyReadiness,
    }
    : {}),
});

const sendAvailabilityForbidden = (res: Response, data: ReturnType<typeof buildConnectShyftAvailabilityPayload>) =>
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_AVAILABILITY_FORBIDDEN',
    message: 'Availability settings require an authorized admin role.',
    refusalType: 'business',
    httpStatus: 200,
    data,
  });

export const getConnectAvailability = async (req: Request, res: Response) => {
  const { flags, entitlementDecision } = await resolveEntitlementAwareConnectShyftFlags(req);
  const availabilityData = buildConnectShyftAvailabilityPayload({
    flags,
    entitlementDecision,
  });

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    sendAvailabilityForbidden(res, availabilityData);
    return;
  }

  if (!canAccessConnectShyftAdminSettingsByCapability(req, contextDecision.context)) {
    sendAvailabilityForbidden(res, availabilityData);
    return;
  }

  const readiness = await connectShyftTelephonyReadinessServiceAsync.inspectReadiness({
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    userId: resolveConnectShyftRequestedActorUserId(req) || '',
    requestedProvider: resolveConnectShyftRequestedProviderKey(req),
    providerRegistryHeaders: resolveProviderRegistryHeaders(req),
  });
  const availabilityWithTelephony = buildConnectShyftAvailabilityPayload({
    flags,
    entitlementDecision,
    telephonyReadiness: {
      voiceReady: readiness.voiceReady,
      smsReady: readiness.smsReady,
      degradedMode: readiness.degradedMode,
      blockingReasonCount: readiness.blockingReasons.length,
    },
  });

  return success(res, {
    code: 'CONNECTSHYFT_AVAILABILITY_RESOLVED',
    message: 'ConnectShyft availability state resolved',
    data: availabilityWithTelephony,
  });
};
