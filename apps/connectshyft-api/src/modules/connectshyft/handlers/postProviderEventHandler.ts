import type { Request, RequestHandler, Response } from 'express';
import { error, success } from '../../../platform/envelopes/response';
import {
  connectShyftCallLifecycleServiceAsync,
  mapConnectShyftWebhookEventToBridgeEvent,
  type ConnectShyftCallLifecycleService,
} from '../callLifecycle';
import { ConnectShyftPersistenceUnavailableError } from '../calls';
import {
  loadConnectShyftBridgeAggregateByProviderCallId,
  loadConnectShyftBridgeAggregateBySessionId,
} from '../bridgeSessions';
import {
  resolveConnectShyftInboundWebhookAccessContext,
  type ConnectShyftInboundWebhookAccessContext,
} from '../http/inboundWebhookContext';

type PostProviderEventHandlerDependencies = {
  callLifecycleService?: ConnectShyftCallLifecycleService;
  resolveWebhookAccessContext?: (
    req: Request,
    res: Response,
  ) => Promise<ConnectShyftInboundWebhookAccessContext | null>;
  loadAggregateBySessionId?: typeof loadConnectShyftBridgeAggregateBySessionId;
  loadAggregateByProviderCallId?: typeof loadConnectShyftBridgeAggregateByProviderCallId;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveOccurredAt = (req: Request): Date => {
  const candidates = [
    req.body?.occurredAt,
    req.body?.occurred_at,
    req.body?.eventTimestamp,
    req.body?.event_timestamp,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (!normalized) {
      continue;
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed;
    }
  }

  return new Date();
};

export const buildPostProviderEventHandler = (
  dependencies: PostProviderEventHandlerDependencies = {},
): RequestHandler => {
  const callLifecycleService =
    dependencies.callLifecycleService || connectShyftCallLifecycleServiceAsync;
  const resolveWebhookAccessContext =
    dependencies.resolveWebhookAccessContext
    || ((req: Request, res: Response) => (
      resolveConnectShyftInboundWebhookAccessContext(req, res, 'inbound')
    ));
  const loadAggregateBySessionId =
    dependencies.loadAggregateBySessionId || loadConnectShyftBridgeAggregateBySessionId;
  const loadAggregateByProviderCallId =
    dependencies.loadAggregateByProviderCallId || loadConnectShyftBridgeAggregateByProviderCallId;

  return async (req, res) => {
    const accessContext = await resolveWebhookAccessContext(req, res);
    if (!accessContext) {
      return;
    }

    try {
      const providerCallId = accessContext.correlation.providerLegId;
      const bridgeSessionId = normalizeString(req.body?.bridgeSessionId);
      const aggregate = bridgeSessionId
        ? await loadAggregateBySessionId(bridgeSessionId)
        : providerCallId
          ? await loadAggregateByProviderCallId({
            tenantId: accessContext.tenantId,
            providerCallId,
          })
          : null;

      if (!aggregate) {
        success(res, {
          code: 'CONNECTSHYFT_PROVIDER_EVENT_ACCEPTED',
          message: 'Provider event accepted.',
          data: {
            handled: false,
          },
        });
        return;
      }

      const occurredAt = resolveOccurredAt(req);
      const event = mapConnectShyftWebhookEventToBridgeEvent({
        aggregate,
        rawEventType: normalizeString(req.body?.eventType)
          || normalizeString(req.body?.event_type)
          || accessContext.eventType,
        providerCallId,
        bridgeSessionId,
        occurredAt,
        reason:
          normalizeString(req.body?.reason)
          || normalizeString(req.body?.hangupCause)
          || normalizeString(req.body?.hangup_cause)
          || null,
      });

      if (!event) {
        success(res, {
          code: 'CONNECTSHYFT_PROVIDER_EVENT_ACCEPTED',
          message: 'Provider event accepted.',
          data: {
            handled: false,
          },
        });
        return;
      }

      await callLifecycleService.handleProviderEvent({
        tenantId: accessContext.tenantId,
        provider: accessContext.providerSelection.providerResolution.resolvedProvider,
        event,
        eventJson: req.body,
        providerCallId,
        occurredAt,
      });

      success(res, {
        code: 'CONNECTSHYFT_PROVIDER_EVENT_ACCEPTED',
        message: 'Provider event accepted.',
        data: {
          handled: true,
        },
      });
    } catch (errorCaught) {
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

export const postProviderEventHandler = buildPostProviderEventHandler();
