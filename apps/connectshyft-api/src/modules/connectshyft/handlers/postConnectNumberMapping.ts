import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftNumberMappingCreateAccessContext } from '../http/numberMappingContext';
import { connectShyftNumberMappingServiceAsync } from '../numberMappings';
import { normalizeConnectShyftNumberMappingContract } from './numberMappingContract';

export const postConnectNumberMapping = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNumberMappingCreateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const saved = await connectShyftNumberMappingServiceAsync.createMapping({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    twilioNumberE164: accessContext.payload.providerNumberE164,
    label: accessContext.payload.label,
    isActive: accessContext.payload.isActive,
  });

  if (!saved.ok) {
    const refusalData = 'data' in saved ? saved.data : undefined;
    sendConnectShyftRouteRefusal(res, {
      code: saved.code,
      message: saved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: normalizeConnectShyftNumberMappingContract(refusalData),
    });
    return;
  }

  return success(res, {
    code: saved.code,
    message: 'ConnectShyft number mapping saved',
    httpStatus: saved.httpStatus,
    data: normalizeConnectShyftNumberMappingContract({
      orgUnitId: saved.data.orgUnitId,
      mappingId: saved.data.mappingId,
      twilioNumberE164: saved.data.twilioNumberE164,
      label: saved.data.label,
      isActive: saved.data.isActive,
      mappings: saved.data.mappings,
    }),
  });
};
