import { Request, Response } from 'express';
import { refusal } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import {
  resolveConnectShyftThreadLifecycleStateContext,
  type ConnectShyftResolvedThreadLifecycleContext,
} from './threadLifecycleContext';
import {
  enforceConnectShyftCapability,
  requestHasAnyCapability,
  resolveConnectShyftActorRoles,
  resolveConnectShyftRequestedActorUserId,
  resolveConnectShyftRouteContextDecision,
  respondWithConnectShyftContextRefusal,
  sendConnectShyftRouteRefusal,
} from './accessContext';

export type ConnectShyftThreadOutboundAction = 'call' | 'message';

export type ConnectShyftThreadOutboundAccessContext = {
  context: ResolvedConnectShyftContext;
  threadId: string;
  actorUserId: string | null;
  actorRoles: string[];
  lifecycleContext: ConnectShyftResolvedThreadLifecycleContext;
};

export type ConnectShyftThreadOutboundCoreExecutionInput =
  ConnectShyftThreadOutboundAccessContext & {
    req: Request;
    res: Response;
    outboundAction: ConnectShyftThreadOutboundAction;
  };

type ConnectShyftThreadOutboundCoreExecutor = (
  input: ConnectShyftThreadOutboundCoreExecutionInput,
) => Promise<void>;

let connectShyftThreadOutboundCoreExecutor: ConnectShyftThreadOutboundCoreExecutor | null = null;

const parseThreadIdParam = (req: Request): string => {
  if (typeof req.params.threadId !== 'string') {
    return '';
  }

  return req.params.threadId.trim();
};

const sendThreadViewCapabilityRefusal = (res: Response): void => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
    message: 'Thread access requires an authorized ConnectShyft role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const sendThreadOutboundCapabilityRefusal = (
  res: Response,
  outboundAction: ConnectShyftThreadOutboundAction,
): void => {
  sendConnectShyftRouteRefusal(res, {
    code: outboundAction === 'call'
      ? 'CONNECTSHYFT_THREAD_CALL_FORBIDDEN'
      : 'CONNECTSHYFT_THREAD_MESSAGE_FORBIDDEN',
    message: outboundAction === 'call'
      ? 'Outbound call requires an authorized orgUnit role.'
      : 'Outbound message requires an authorized orgUnit role.',
    refusalType: 'business',
    httpStatus: 200,
  });
};

const sendEscalationActionMembershipRefusal = (res: Response): void => {
  sendConnectShyftRouteRefusal(res, {
    code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
    message: 'orgUnit membership is required for this ConnectShyft route',
    refusalType: 'business',
    httpStatus: 200,
  });
};

export const resolveConnectShyftThreadOutboundAccessContext = async (
  req: Request,
  res: Response,
  outboundAction: ConnectShyftThreadOutboundAction,
): Promise<ConnectShyftThreadOutboundAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'inbox')) {
    return null;
  }

  const contextDecision = await resolveConnectShyftRouteContextDecision(req);
  if (!contextDecision.ok) {
    respondWithConnectShyftContextRefusal(res, contextDecision);
    return null;
  }

  if (!requestHasAnyCapability(req, [
    CAPABILITIES.ORG_UNIT_THREAD_VIEW,
    CAPABILITIES.THREAD_VIEW_ALL,
  ], contextDecision.context)) {
    sendThreadViewCapabilityRefusal(res);
    return null;
  }

  if (
    !requestHasAnyCapability(
      req,
      outboundAction === 'call'
        ? [CAPABILITIES.ORG_UNIT_CALL_INITIATE, CAPABILITIES.THREAD_TAKEOVER_ALL]
        : [CAPABILITIES.ORG_UNIT_SMS_SEND, CAPABILITIES.THREAD_TAKEOVER_ALL],
      contextDecision.context,
    )
  ) {
    sendThreadOutboundCapabilityRefusal(res, outboundAction);
    return null;
  }

  if (
    contextDecision.context.bypassedOrgUnitMembership
    && !requestHasAnyCapability(req, [CAPABILITIES.THREAD_TAKEOVER_ALL], contextDecision.context)
  ) {
    sendEscalationActionMembershipRefusal(res);
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

  const actorUserId = resolveConnectShyftRequestedActorUserId(req);
  const actorRoles = resolveConnectShyftActorRoles(req, contextDecision.context);
  const lifecycleContext = await resolveConnectShyftThreadLifecycleStateContext({
    tenantId: contextDecision.context.tenantId,
    orgUnitId: contextDecision.context.orgUnitId,
    threadId,
    actorUserId,
  });

  if (!lifecycleContext.currentState) {
    sendConnectShyftRouteRefusal(res, {
      code: 'CONNECTSHYFT_THREAD_NOT_FOUND',
      message: 'Thread not found for this tenant/orgUnit context.',
      refusalType: 'business',
      httpStatus: 200,
      data: {
        context: contextDecision.context,
        threadId,
      },
    });
    return null;
  }

  return {
    context: contextDecision.context,
    threadId,
    actorUserId,
    actorRoles,
    lifecycleContext,
  };
};

export const registerConnectShyftThreadOutboundCoreExecutor = (
  executor: ConnectShyftThreadOutboundCoreExecutor,
): void => {
  connectShyftThreadOutboundCoreExecutor = executor;
};

export const executeConnectShyftThreadOutboundAction = async (
  req: Request,
  res: Response,
  outboundAction: ConnectShyftThreadOutboundAction,
): Promise<void> => {
  const accessContext = await resolveConnectShyftThreadOutboundAccessContext(
    req,
    res,
    outboundAction,
  );
  if (!accessContext) {
    return;
  }

  if (!connectShyftThreadOutboundCoreExecutor) {
    throw new Error('ConnectShyft thread outbound core executor is not registered.');
  }

  await connectShyftThreadOutboundCoreExecutor({
    req,
    res,
    outboundAction,
    ...accessContext,
  });
};
