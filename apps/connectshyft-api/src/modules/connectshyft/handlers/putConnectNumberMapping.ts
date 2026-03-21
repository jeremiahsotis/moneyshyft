import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { sendConnectShyftRouteRefusal } from '../http/accessContext';
import { resolveConnectShyftNumberMappingUpdateAccessContext } from '../http/numberMappingContext';
import { connectShyftNumberMappingServiceAsync } from '../numberMappings';
import { normalizeConnectShyftNumberMappingContract } from './numberMappingContract';

export const putConnectNumberMapping = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNumberMappingUpdateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const updated = await connectShyftNumberMappingServiceAsync.updateMapping({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    mappingId: accessContext.mappingId,
    twilioNumberE164: accessContext.payload.providerNumberE164,
    label: accessContext.payload.label,
    isActive: accessContext.payload.isActive,
  });

  if (!updated.ok) {
    sendConnectShyftRouteRefusal(res, {
      code: updated.code,
      message: updated.message,
      refusalType: 'business',
      httpStatus: 200,
      data: normalizeConnectShyftNumberMappingContract(updated.data),
    });
    return;
  }

  return success(res, {
    code: updated.code,
    message: 'ConnectShyft number mapping updated',
    httpStatus: updated.httpStatus,
    data: normalizeConnectShyftNumberMappingContract({
      mappingId: updated.data.mappingId,
      orgUnitId: updated.data.orgUnitId,
      twilioNumberE164: updated.data.twilioNumberE164,
      label: updated.data.label,
      isActive: updated.data.isActive,
      mappings: updated.data.mappings,
    }),
  });
};
