import { Request, Response } from 'express';
import { refusal } from '../../../platform/envelopes/response';
import { CAPABILITIES } from '../../../platform/rbac/capabilities';
import type { ResolvedConnectShyftContext } from '../contextAccess';
import type { ConnectShyftTelephonyReadiness } from '../telephonyReadiness';
import { connectShyftTelephonyReadinessServiceAsync } from '../telephonyReadiness';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
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

const resolveProviderRegistryHeaders = (
  req: Request,
): Record<string, string | undefined> => Object.fromEntries(
  Object.entries(req.headers).map(([key, value]) => [
    key,
    Array.isArray(value)
      ? value[0]
      : typeof value === 'string'
        ? value
        : undefined,
  ]),
);

const buildThreadOutboundReadinessMessage = (
  outboundAction: ConnectShyftThreadOutboundAction,
): string => outboundAction === 'call'
  ? 'Outbound bridge calls are unavailable until telephony readiness requirements are satisfied.'
  : 'Outbound SMS is unavailable until telephony readiness requirements are satisfied.';

const buildThreadOutboundReadinessUiFeedback = (
  outboundAction: ConnectShyftThreadOutboundAction,
  message: string,
) => ({
  severity: 'warning' as const,
  ariaLive: 'assertive' as const,
  messageKey: outboundAction === 'call'
    ? 'connectshyft.outbound.call.not_ready'
    : 'connectshyft.outbound.message.not_ready',
  presentation: 'contextual-action-feedback' as const,
  requiresAction: true,
  actionLabel: 'Review telephony',
  accessibilityHint: outboundAction === 'call'
    ? 'Resolve telephony readiness requirements before retrying the outbound call.'
    : 'Resolve telephony readiness requirements before retrying the outbound message.',
  message,
});

const buildThreadOutboundProviderResolution = (
  readiness: ConnectShyftTelephonyReadiness,
) => ({
  requestedProvider: readiness.provider.requestedProvider,
  resolvedProvider: readiness.provider.resolvedProvider,
  deterministic: readiness.provider.deterministic,
  adapterInterfaceVersion: readiness.provider.adapterInterfaceVersion,
  providerBranchingInDomain: false,
});

const sendThreadOutboundReadinessRefusal = (
  res: Response,
  accessContext: ConnectShyftThreadOutboundAccessContext,
  outboundAction: ConnectShyftThreadOutboundAction,
  readiness: ConnectShyftTelephonyReadiness,
): void => {
  const message = buildThreadOutboundReadinessMessage(outboundAction);

  sendConnectShyftRouteRefusal(res, {
    code: outboundAction === 'call'
      ? 'CONNECTSHYFT_VOICE_NOT_READY'
      : 'CONNECTSHYFT_SMS_NOT_READY',
    message,
    refusalType: 'business',
    httpStatus: 200,
    data: {
      context: accessContext.context,
      threadId: accessContext.threadId,
      providerResolution: buildThreadOutboundProviderResolution(readiness),
      telephonyReadiness: readiness,
      uiFeedback: buildThreadOutboundReadinessUiFeedback(outboundAction, message),
      chrome: {
        persistentOperationsBannerVisible: false,
        heavyOperationsDefaultLayout: false,
      },
      sideEffects: outboundAction === 'call'
        ? {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        }
        : {
          messageDispatched: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
    },
  });
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

  const readiness = await connectShyftTelephonyReadinessServiceAsync.inspectReadiness({
    tenantId: accessContext.context.tenantId,
    orgUnitId: accessContext.context.orgUnitId,
    userId: accessContext.actorUserId || '',
    requestedProvider: resolveConnectShyftRequestedProviderKey(req),
    providerRegistryHeaders: resolveProviderRegistryHeaders(req),
  });
  const channelReady = outboundAction === 'call'
    ? readiness.voiceReady
    : readiness.smsReady;
  if (!channelReady) {
    sendThreadOutboundReadinessRefusal(res, accessContext, outboundAction, readiness);
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
