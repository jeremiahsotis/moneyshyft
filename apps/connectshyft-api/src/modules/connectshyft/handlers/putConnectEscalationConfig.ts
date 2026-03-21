import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { resolveConnectShyftEscalationRecipientDirectory } from '../escalationRecipientDirectory';
import {
  ConnectShyftEscalationConfigService,
  KnexConnectShyftEscalationConfigStore,
} from '../escalationConfig';
import { sendConnectShyftRouteRefusal, loadConnectShyftPlatformDb } from '../http/accessContext';
import { resolveConnectShyftEscalationConfigUpdateAccessContext } from '../http/escalationConfigContext';

const connectShyftEscalationConfigService = new ConnectShyftEscalationConfigService(
  new KnexConnectShyftEscalationConfigStore(loadConnectShyftPlatformDb),
);

export const putConnectEscalationConfig = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftEscalationConfigUpdateAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const recipientDirectory = await resolveConnectShyftEscalationRecipientDirectory(
    req,
    accessContext.context.tenantId,
    accessContext.context.orgUnitId,
  );

  const saved = await connectShyftEscalationConfigService.saveConfig({
    actorRoles: accessContext.actorRoles,
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    escalationBaselineHours: accessContext.payload.escalationBaselineHours,
    recipients: accessContext.payload.recipients,
    recipientDirectory,
  });

  if (!saved.ok) {
    const refusalData = 'data' in saved ? saved.data : undefined;
    sendConnectShyftRouteRefusal(res, {
      code: saved.code,
      message: saved.message,
      refusalType: 'business',
      httpStatus: 200,
      data: refusalData,
    });
    return;
  }

  return success(res, {
    code: saved.code,
    message: 'ConnectShyft escalation settings saved',
    httpStatus: saved.httpStatus,
    data: {
      orgUnitId: saved.data.orgUnitId,
      escalationBaselineHours: saved.data.escalationBaselineHours,
      recipients: saved.data.recipients,
      updatedAtUtc: saved.data.updatedAtUtc,
    },
  });
};
