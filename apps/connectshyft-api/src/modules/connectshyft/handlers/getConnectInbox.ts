import { Request, Response } from 'express';
import { success } from '../../platform/envelopes/response';
import { CAPABILITIES } from '../../platform/rbac/capabilities';
import {
  parseConnectShyftInboxBucket,
  resolveConnectShyftInboxContractAsync,
  type ConnectShyftInboxBucket,
} from '../readContracts';
import {
  enforceConnectShyftCapability,
  loadConnectShyftPlatformDb,
  requestHasAnyCapability,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from '../http/accessContext';

const CONNECTSHYFT_INBOX_P95_BUDGET_MS = 750;
const CONNECTSHYFT_INBOX_P99_BUDGET_MS = 1500;

export const getConnectInbox = async (req: Request, res: Response) => {
  const flags = await enforceConnectShyftCapability(req, res, 'inbox');
  if (!flags) {
    return;
  }

  if (!requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
  ])) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
      message: 'Thread access requires an authorized ConnectShyft role.',
      refusalType: 'business',
      httpStatus: 200,
    });
    return;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return;
  }

  const requestedBucket = parseConnectShyftInboxBucket(req.query?.bucket);
  const resolvedBucket: ConnectShyftInboxBucket = requestedBucket || 'inbox';
  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  if (resolvedBucket === 'mine' && !actorUserId) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_ACTOR_CONTEXT_REQUIRED',
      message: 'Mine queue requires an authenticated actor context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        bucket: resolvedBucket,
      },
    });
    return;
  }

  const items = await resolveConnectShyftInboxContractAsync({
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    bucket: resolvedBucket,
    actorUserId,
    db: loadConnectShyftPlatformDb(),
  });

  const responseCode = requestedBucket
    ? (resolvedBucket === 'mine'
      ? 'CONNECTSHYFT_MINE_LISTED'
      : 'CONNECTSHYFT_INBOX_LISTED')
    : 'CONNECTSHYFT_INBOX_READY';

  const responseMessage = requestedBucket
    ? (resolvedBucket === 'mine'
      ? 'ConnectShyft mine threads listed'
      : 'ConnectShyft inbox threads listed')
    : 'ConnectShyft inbox is available for this tenant';

  return success(res, {
    code: responseCode,
    message: responseMessage,
    data: {
      context: {
        tenantId: contextDecision.context.tenantId,
        orgUnitId: contextDecision.context.orgUnitId,
        bypassedOrgUnitMembership: contextDecision.context.bypassedOrgUnitMembership,
      },
      bucket: resolvedBucket,
      items,
      actions: {
        claim: flags.connectshyft_escalation_enabled,
        takeover: flags.connectshyft_escalation_enabled,
      },
      latencyBudgetsMs: {
        p95: CONNECTSHYFT_INBOX_P95_BUDGET_MS,
        p99: CONNECTSHYFT_INBOX_P99_BUDGET_MS,
      },
    },
  });
};
