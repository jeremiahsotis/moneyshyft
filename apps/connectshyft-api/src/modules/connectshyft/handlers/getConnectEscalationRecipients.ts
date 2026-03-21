import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { resolveConnectShyftEscalationRecipientDirectory } from '../escalationRecipientDirectory';
import { resolveConnectShyftEscalationRecipientsAccessContext } from '../http/escalationConfigContext';

export const getConnectEscalationRecipients = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftEscalationRecipientsAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  const recipientDirectory = await resolveConnectShyftEscalationRecipientDirectory(
    req,
    accessContext.context.tenantId,
    accessContext.context.orgUnitId,
  );

  return success(res, {
    code: 'CONNECTSHYFT_ESCALATION_RECIPIENTS_RESOLVED',
    message: 'ConnectShyft escalation recipients resolved',
    data: {
      orgUnitId: accessContext.context.orgUnitId,
      recipientOptions: recipientDirectory.options,
    },
  });
};
