import type { Request, RequestHandler, Response } from 'express';
import { error, refusal, success } from '../../../platform/envelopes/response';
import { resolveConnectShyftRequestedProviderKey } from '../providerRegistry';
import {
  connectShyftTelephonyReadinessServiceAsync,
  type AsyncConnectShyftTelephonyReadinessService,
} from '../telephonyReadiness';
import {
  connectShyftCallLifecycleServiceAsync,
  ConnectShyftCallLifecycleRefusalError,
  type ConnectShyftCallLifecycleService,
} from '../callLifecycle';
import { ConnectShyftPersistenceUnavailableError } from '../calls';
import {
  resolveConnectShyftThreadOutboundAccessContext,
  type ConnectShyftThreadOutboundAccessContext,
} from '../http/threadOutboundContext';

type PostThreadCallHandlerDependencies = {
  callLifecycleService?: ConnectShyftCallLifecycleService;
  readinessService?: Pick<AsyncConnectShyftTelephonyReadinessService, 'inspectReadiness'>;
  resolveAccessContext?: (
    req: Request,
    res: Response,
  ) => Promise<ConnectShyftThreadOutboundAccessContext | null>;
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

const mapCallResponse = (call: Awaited<ReturnType<ConnectShyftCallLifecycleService['startCall']>>) => ({
  callId: call.id,
  tenantId: call.tenantId,
  orgUnitId: call.orgUnitId,
  threadId: call.threadId,
  personId: call.personId,
  bridgeSessionId: call.bridgeSessionId,
  status: call.status,
  startedAtUtc: call.startedAtUtc,
  operatorAnsweredAtUtc: call.operatorAnsweredAtUtc,
  neighborAnsweredAtUtc: call.neighborAnsweredAtUtc,
  bridgedAtUtc: call.bridgedAtUtc,
  endedAtUtc: call.endedAtUtc,
  failureCode: call.failureCode,
  failureMessage: call.failureMessage,
});

export const buildPostThreadCallHandler = (
  dependencies: PostThreadCallHandlerDependencies = {},
): RequestHandler => {
  const callLifecycleService =
    dependencies.callLifecycleService || connectShyftCallLifecycleServiceAsync;
  const readinessService =
    dependencies.readinessService || connectShyftTelephonyReadinessServiceAsync;
  const resolveAccessContext =
    dependencies.resolveAccessContext
    || ((req: Request, res: Response) => (
      resolveConnectShyftThreadOutboundAccessContext(req, res, 'call')
    ));

  return async (req, res) => {
    const accessContext = await resolveAccessContext(req, res);
    if (!accessContext) {
      return;
    }

    try {
      const readiness = await readinessService.inspectReadiness({
        tenantId: accessContext.context.tenantId,
        orgUnitId: accessContext.context.orgUnitId,
        userId: accessContext.actorUserId || '',
        requestedProvider: resolveConnectShyftRequestedProviderKey(req),
        providerRegistryHeaders: resolveProviderRegistryHeaders(req),
      });
      if (!readiness.bridgeCallRunnable) {
        refusal(res, {
          code: 'CONNECTSHYFT_TELEPHONY_NOT_READY',
          message: 'Outbound bridge calls are unavailable until telephony readiness requirements are satisfied.',
          refusalType: 'business',
          httpStatus: 200,
          data: {
            context: accessContext.context,
            threadId: accessContext.threadId,
            telephonyReadiness: readiness,
          },
        });
        return;
      }

      const call = await callLifecycleService.startCall({
        tenantId: accessContext.context.tenantId,
        orgUnitId: accessContext.context.orgUnitId,
        threadId: accessContext.threadId,
        personId: accessContext.lifecycleContext.detail?.personId || '',
        idempotencyKey: typeof req.header('idempotency-key') === 'string'
          ? req.header('idempotency-key')!.trim() || undefined
          : undefined,
        actorRoles: accessContext.actorRoles,
        actorUserId: accessContext.actorUserId,
        requestedProvider: resolveConnectShyftRequestedProviderKey(req),
        providerRegistryHeaders: resolveProviderRegistryHeaders(req),
      });

      success(res, {
        code: 'CONNECTSHYFT_CALL_STARTED',
        message: 'Call started.',
        data: {
          call: mapCallResponse(call),
          bridgeSession: {
            bridgeSessionId: call.bridgeSessionId,
            status: call.status,
          },
        },
      });
    } catch (errorCaught) {
      if (errorCaught instanceof ConnectShyftCallLifecycleRefusalError) {
        refusal(res, {
          code: errorCaught.code,
          message: errorCaught.message,
          refusalType: errorCaught.refusalType,
          httpStatus: errorCaught.httpStatus,
          data: errorCaught.data,
        });
        return;
      }

      if (errorCaught instanceof ConnectShyftPersistenceUnavailableError) {
        error(res, {
          code: errorCaught.code,
          message: errorCaught.message,
          httpStatus: 503,
        });
        return;
      }

      throw errorCaught;
    }
  };
};

export const postThreadCallHandler = buildPostThreadCallHandler();
