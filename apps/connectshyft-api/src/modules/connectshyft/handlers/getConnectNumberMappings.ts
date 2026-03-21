import { Request, Response } from 'express';
import { success } from '../../../platform/envelopes/response';
import { resolveConnectShyftNumberMappingListAccessContext } from '../http/numberMappingContext';
import { connectShyftNumberMappingServiceAsync } from '../numberMappings';
import { normalizeConnectShyftNumberMappingContract } from './numberMappingContract';

export const getConnectNumberMappings = async (req: Request, res: Response) => {
  const accessContext = await resolveConnectShyftNumberMappingListAccessContext(req, res);
  if (!accessContext) {
    return;
  }

  return success(res, {
    code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
    message: 'ConnectShyft number mappings resolved',
    data: {
      orgUnitId: accessContext.context.orgUnitId,
      mappings: normalizeConnectShyftNumberMappingContract(
        await connectShyftNumberMappingServiceAsync.listMappings(
          accessContext.context.tenantId,
          accessContext.context.orgUnitId,
        ),
      ),
    },
  });
};
