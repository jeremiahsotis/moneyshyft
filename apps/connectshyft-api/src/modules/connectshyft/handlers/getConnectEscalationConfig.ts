import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import {
  ConnectShyftEscalationConfigService,
  KnexConnectShyftEscalationConfigStore,
} from '../escalationConfig';
import { resolveConnectShyftEscalationConfigReadAccessContext } from '../http/escalationConfigContext';
import { loadConnectShyftPlatformDb } from '../http/accessContext';

const connectShyftEscalationConfigService = new ConnectShyftEscalationConfigService(
  new KnexConnectShyftEscalationConfigStore(loadConnectShyftPlatformDb),
);

export const getConnectEscalationConfig = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftEscalationConfigReadAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const config = await connectShyftEscalationConfigService.getConfig(
    accessContext.context.tenantId,
    accessContext.context.orgUnitId,
  );

  return success(res, {
    code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
    message: 'ConnectShyft escalation configuration resolved',
    data: {
      orgUnitId: config.orgUnitId,
      escalationBaselineHours: config.escalationBaselineHours,
      recipients: config.recipients,
      updatedAtUtc: config.updatedAtUtc,
    },
  });
};
