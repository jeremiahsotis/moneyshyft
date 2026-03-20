import { Request, Response } from 'express';
import { refusal } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import {
  resolveConnectShyftThreadDetailContractAsync,
  type ConnectShyftThreadDetailRecord,
} from '../readContracts';
import {
  enforceConnectShyftCapability,
  loadConnectShyftPlatformDb,
  requestHasAnyCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRequestedRole,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

type ConnectShyftDeletedNeighborReadRefusal = {
  code: string;
  message: string;
};

export type ConnectShyftThreadReadAccessContext = {
  context: ResolvedConnectShyftContext;
  includeDeleted: boolean;
  threadId: string;
  actorUserId: string | null;
  requestedRole: string | null;
};

export type ConnectShyftThreadTimelineReadContext = ConnectShyftThreadReadAccessContext & {
  thread: ConnectShyftThreadDetailRecord;
};

const DEFAULT_THREAD_NOT_FOUND_MESSAGE = 'Thread detail is unavailable for the requested orgUnit context.';

const parseOptionalBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }

  return null;
};

const parseIncludeDeletedQuery = (req: Request): boolean =>
  parseOptionalBoolean(req.query?.includeDeleted) === true;

const parseThreadIdParam = (req: Request): string => {
  if (typeof req.params.threadId !== 'string') {
    return '';
  }

  return req.params.threadId.trim();
};

export const buildConnectShyftThreadReadResponseContext = (
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId' | 'bypassedOrgUnitMembership'>,
) => ({
  tenantId: context.tenantId,
  orgUnitId: context.orgUnitId,
  bypassedOrgUnitMembership: context.bypassedOrgUnitMembership,
});

export const sendConnectShyftThreadUnavailableRefusal = (
  res: Response,
  context: Pick<ResolvedConnectShyftContext, 'tenantId' | 'orgUnitId' | 'bypassedOrgUnitMembership'>,
) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
    message: DEFAULT_THREAD_NOT_FOUND_MESSAGE,
    refusalType: 'business',
    httpStatus: 200,
    data: {
      context: buildConnectShyftThreadReadResponseContext(context),
    },
  });
};

const sendConnectShyftThreadViewForbidden = (res: Response) => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
    message: 'Thread access requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const resolveConnectShyftThreadReadAccessContext = async (
  req: Request,
  res: Response,
  deletedNeighborRefusal: ConnectShyftDeletedNeighborReadRefusal,
): Promise<ConnectShyftThreadReadAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'inbox')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  const includeDeleted = parseIncludeDeletedQuery(req);
  if (includeDeleted) {
    if (!requestHasAnyCapability(req, [CAPABILITIES.NEIGHBOR_EDIT_ALL], contextDecision.context)) {
      sendConnectShyftRouteRefusal(res, {
        code: deletedNeighborRefusal.code,
        message: deletedNeighborRefusal.message,
        refusalType: 'business',
        httpStatus: 200,
      });
      return null;
    }
  } else if (!requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
  ], contextDecision.context)) {
    sendConnectShyftThreadViewForbidden(res);
    return null;
  }

  const threadId = parseThreadIdParam(req);
  if (!threadId) {
    refusal(res, {
      code: 'CONNECTSHYFT_THREAD_ID_REQUIRED',
      message: 'threadId is required',
      refusalType: 'client',
      httpStatus: 400,
    });
    return null;
  }

  return {
    context: contextDecision.context,
    includeDeleted,
    threadId,
    actorUserId: resolveConnectShyftRequestedActorUserId(req),
    requestedRole: resolveConnectShyftRequestedRole(req),
  };
};

export const resolveConnectShyftThreadDetailReadAccessContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftThreadReadAccessContext | null> => resolveConnectShyftThreadReadAccessContext(
  req,
  res,
  {
    code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
    message: 'Deleted neighbor thread detail requires a tenant-privileged ConnectShyft admin role.',
  },
);

export const loadConnectShyftThreadReadContractAsync = async (
  input: ConnectShyftThreadReadAccessContext,
): Promise<ConnectShyftThreadDetailRecord | null> => {
  return resolveConnectShyftThreadDetailContractAsync({
    tenantId: input.context.tenantId,
    orgUnitId: input.context.orgUnitId,
    threadId: input.threadId,
    actorUserId: input.actorUserId,
    requestedRole: input.requestedRole,
    includeDeleted: input.includeDeleted,
    db: loadConnectShyftPlatformDb(),
  });
};

export const resolveConnectShyftThreadTimelineReadContext = async (
  req: Request,
  res: Response,
): Promise<ConnectShyftThreadTimelineReadContext | null> => {
  const accessContext = await resolveConnectShyftThreadReadAccessContext(req, res, {
    code: 'CONNECTSHYFT_NEIGHBOR_READ_FORBIDDEN',
    message: 'Deleted neighbor timeline requires a tenant-privileged ConnectShyft admin role.',
  });
  if (!accessContext) {
    return null;
  }

  const thread = await loadConnectShyftThreadReadContractAsync(accessContext);
  if (!thread) {
    sendConnectShyftThreadUnavailableRefusal(res, accessContext.context);
    return null;
  }

  return {
    ...accessContext,
    thread,
  };
};
