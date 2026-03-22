import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { connectShyftTelephonyReadinessServiceAsync } from '../telephonyReadiness';
import { resolveConnectShyftTelephonyReadinessAccessContext } from '../http/telephonySettingsContext';

const resolveProviderRegistryHeaders = (
  req: Request,
): Record<string, string | undefined> => Object.fromEntries(
  Object.entries(req.headers).map(([key, value]) => [
    key,
    Array.isArray(value) ? value[0] : value,
  ]),
);

export const getConnectTelephonyReadiness = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftTelephonyReadinessAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const readiness = await connectShyftTelephonyReadinessServiceAsync.inspectReadiness({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    userId: accessContext.actorUserId,
    requestedProvider: accessContext.requestedProvider,
    providerRegistryHeaders: resolveProviderRegistryHeaders(req),
  });

  return success(res, {
    code: 'CONNECTSHYFT_TELEPHONY_READINESS_RESOLVED',
    message: 'ConnectShyft telephony readiness resolved',
    data: readiness,
  });
};
