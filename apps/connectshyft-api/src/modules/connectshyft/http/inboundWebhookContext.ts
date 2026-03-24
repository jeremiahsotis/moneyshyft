import { Request, Response } from 'express';
import { refusal } from '../../../platform/envelopes/response';
import logger from '../../../utils/logger';
import {
  buildConnectShyftWebhookVerificationInput,
  mapConnectShyftWebhookVerificationResult,
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
  type ConnectShyftProviderCanonicalEvent,
  type ConnectShyftProviderResolutionSuccess,
} from '../providerRegistry';
import { connectShyftNumberMappingServiceAsync } from '../numberMappings';
import { resolveConnectShyftProviderCorrelationByIdentifiers } from '../providerCorrelationMappings';
import {
  enforceConnectShyftCapability,
  loadConnectShyftPlatformDb,
} from './accessContext';

export type ConnectShyftInboundWebhookRouteKind = 'inbound' | 'sms';
export type ConnectShyftWebhookCorrelationSource = 'metadata' | 'provider_fallback' | 'number_mapping';

export type ConnectShyftResolvedWebhookCorrelation =
  | {
    ok: true;
    source: ConnectShyftWebhookCorrelationSource;
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    providerLegId: string | null;
    providerMessageId: string | null;
    providerEventId: string | null;
    providerNumberE164: string | null;
  }
  | {
    ok: false;
    code:
      | 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED'
      | 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND'
      | 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS'
      | 'CONNECTSHYFT_WEBHOOK_CORRELATION_LOOKUP_UNAVAILABLE'
      | 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT';
    message: string;
    reason: 'missing-identifiers' | 'not-found' | 'ambiguous' | 'unavailable' | 'conflict';
    providerLegId: string | null;
    providerMessageId: string | null;
    providerEventId: string | null;
    providerNumberE164: string | null;
  };

export type ConnectShyftInboundWebhookAccessContext = {
  routeKind: ConnectShyftInboundWebhookRouteKind;
  providerSelection: ConnectShyftProviderResolutionSuccess;
  canonicalTranslation: ConnectShyftProviderCanonicalEvent;
  eventType: string;
  normalizedEventType: string;
  correlation: Extract<ConnectShyftResolvedWebhookCorrelation, { ok: true }>;
  tenantId: string;
  orgUnitId: string;
  threadId: string;
};

export type ConnectShyftInboundWebhookCoreExecutionInput =
  ConnectShyftInboundWebhookAccessContext & {
    req: Request;
    res: Response;
  };

type ConnectShyftInboundWebhookCoreExecutor = (
  input: ConnectShyftInboundWebhookCoreExecutionInput,
) => Promise<void>;

let connectShyftInboundWebhookCoreExecutor: ConnectShyftInboundWebhookCoreExecutor | null = null;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const inferConnectShyftInboundWebhookRouteKind = (
  req: Request,
): ConnectShyftInboundWebhookRouteKind => {
  const pathCandidates = [
    req.path,
    req.url,
    req.originalUrl,
  ]
    .map((value) => normalizeString(value))
    .filter((value) => value.length > 0);

  return pathCandidates.some((value) => value.endsWith('/webhooks/sms') || value.endsWith('/sms'))
    ? 'sms'
    : 'inbound';
};

const resolveWebhookCorrelationFailure = (
  reason: 'missing-identifiers' | 'not-found' | 'ambiguous' | 'unavailable',
): {
  code:
    | 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED'
    | 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND'
    | 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS'
    | 'CONNECTSHYFT_WEBHOOK_CORRELATION_LOOKUP_UNAVAILABLE';
  message: string;
} => {
  if (reason === 'missing-identifiers') {
    return {
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED',
      message: 'Inbound webhook requires correlation metadata or provider identifiers.',
    };
  }
  if (reason === 'ambiguous') {
    return {
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS',
      message: 'Inbound webhook correlation is ambiguous across provider identifiers.',
    };
  }
  if (reason === 'unavailable') {
    return {
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_LOOKUP_UNAVAILABLE',
      message: 'Inbound webhook correlation lookup is temporarily unavailable.',
    };
  }

  return {
    code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND',
    message: 'Inbound webhook correlation mapping not found for provider identifiers.',
  };
};

const resolveInboundWebhookCorrelation = async (input: {
  body: unknown;
  channelHint: 'sms' | 'voice';
  providerName: string;
  providerCorrelation: {
    providerLegId: string | null;
    providerMessageId: string | null;
    providerEventId: string | null;
    providerNumber: string | null;
  };
  tenantIdHint?: string | null;
}): Promise<ConnectShyftResolvedWebhookCorrelation> => {
  const payload = asRecord(input.body);
  const tenantId = normalizeString(payload?.tenantId);
  const orgUnitId = normalizeString(payload?.orgUnitId);
  const threadId = normalizeString(payload?.threadId);
  const providerIdentifiers = {
    providerLegId: normalizeString(input.providerCorrelation.providerLegId) || null,
    providerMessageId: normalizeString(input.providerCorrelation.providerMessageId) || null,
    providerEventId: normalizeString(input.providerCorrelation.providerEventId) || null,
  };
  const providerNumberE164 = normalizeString(input.providerCorrelation.providerNumber) || null;
  const tenantScopeHint = normalizeString(input.tenantIdHint || null);
  const numberMappingTenantScope = tenantId
    || (tenantScopeHint.toLowerCase() !== 'public' ? tenantScopeHint : '')
    || null;
  const hasCompleteMetadata = Boolean(tenantId && orgUnitId && threadId);
  const platformDb = loadConnectShyftPlatformDb();

  if (hasCompleteMetadata) {
    const fallbackProbe = await resolveConnectShyftProviderCorrelationByIdentifiers({
      providerName: input.providerName,
      providerLegId: providerIdentifiers.providerLegId,
      providerMessageId: providerIdentifiers.providerMessageId,
      tenantId,
      db: platformDb,
    });

    if (
      fallbackProbe.ok
      && (
        fallbackProbe.correlation.tenantId !== tenantId
        || fallbackProbe.correlation.orgUnitId !== orgUnitId
        || fallbackProbe.correlation.threadId !== threadId
      )
    ) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
        message: 'Inbound webhook correlation metadata conflicts with provider identifier mapping.',
        reason: 'conflict',
        providerLegId: providerIdentifiers.providerLegId,
        providerMessageId: providerIdentifiers.providerMessageId,
        providerEventId: providerIdentifiers.providerEventId,
        providerNumberE164,
      };
    }

    return {
      ok: true,
      source: 'metadata',
      tenantId,
      orgUnitId,
      threadId,
      providerLegId: providerIdentifiers.providerLegId,
      providerMessageId: providerIdentifiers.providerMessageId,
      providerEventId: providerIdentifiers.providerEventId,
      providerNumberE164,
    };
  }

  const fallback = await resolveConnectShyftProviderCorrelationByIdentifiers({
    providerName: input.providerName,
    providerLegId: providerIdentifiers.providerLegId,
    providerMessageId: providerIdentifiers.providerMessageId,
    tenantId: tenantId || null,
    db: platformDb,
  });
  if (!fallback.ok && providerNumberE164) {
    try {
      const numberMapping = await connectShyftNumberMappingServiceAsync.resolveRoutingMappingByNumber({
        tenantId: numberMappingTenantScope,
        twilioNumberE164: providerNumberE164,
      });
      if (numberMapping.status === 'found') {
        return {
          ok: true,
          source: 'number_mapping',
          tenantId: numberMapping.mapping.tenantId,
          orgUnitId: numberMapping.mapping.orgUnitId,
          threadId: '',
          providerLegId: providerIdentifiers.providerLegId,
          providerMessageId: providerIdentifiers.providerMessageId,
          providerEventId: providerIdentifiers.providerEventId,
          providerNumberE164: numberMapping.mapping.twilioNumberE164,
        };
      }

      if (numberMapping.status === 'ambiguous') {
        return {
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_AMBIGUOUS',
          message: 'Inbound webhook correlation is ambiguous across provider number mappings.',
          reason: 'ambiguous',
          providerLegId: providerIdentifiers.providerLegId,
          providerMessageId: providerIdentifiers.providerMessageId,
          providerEventId: providerIdentifiers.providerEventId,
          providerNumberE164,
        };
      }
    } catch (_error) {
      return {
        ok: false,
        code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_LOOKUP_UNAVAILABLE',
        message: 'Inbound webhook correlation lookup is temporarily unavailable.',
        reason: 'unavailable',
        providerLegId: providerIdentifiers.providerLegId,
        providerMessageId: providerIdentifiers.providerMessageId,
        providerEventId: providerIdentifiers.providerEventId,
        providerNumberE164,
      };
    }

    if (fallback.reason === 'missing-identifiers') {
      return {
        ok: false,
        code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_NOT_FOUND',
        message: 'Inbound webhook correlation mapping not found for provider identifiers.',
        reason: 'not-found',
        providerLegId: providerIdentifiers.providerLegId,
        providerMessageId: providerIdentifiers.providerMessageId,
        providerEventId: providerIdentifiers.providerEventId,
        providerNumberE164,
      };
    }
  }

  if (!fallback.ok) {
    const failure = resolveWebhookCorrelationFailure(fallback.reason);
    return {
      ok: false,
      code: failure.code,
      message: failure.message,
      reason: fallback.reason,
      providerLegId: providerIdentifiers.providerLegId,
      providerMessageId: providerIdentifiers.providerMessageId,
      providerEventId: providerIdentifiers.providerEventId,
      providerNumberE164,
    };
  }

  if (
    (tenantId && tenantId !== fallback.correlation.tenantId)
    || (orgUnitId && orgUnitId !== fallback.correlation.orgUnitId)
    || (threadId && threadId !== fallback.correlation.threadId)
  ) {
    return {
      ok: false,
      code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
      message: 'Inbound webhook partial metadata conflicts with provider identifier mapping.',
      reason: 'conflict',
      providerLegId: providerIdentifiers.providerLegId,
      providerMessageId: providerIdentifiers.providerMessageId,
      providerEventId: providerIdentifiers.providerEventId,
      providerNumberE164,
    };
  }

  return {
    ok: true,
    source: 'provider_fallback',
    tenantId: fallback.correlation.tenantId,
    orgUnitId: fallback.correlation.orgUnitId,
    threadId: fallback.correlation.threadId,
    providerLegId: providerIdentifiers.providerLegId,
    providerMessageId: providerIdentifiers.providerMessageId,
    providerEventId: providerIdentifiers.providerEventId,
    providerNumberE164,
  };
};

export const resolveConnectShyftInboundWebhookAccessContext = async (
  req: Request,
  res: Response,
  routeKind: ConnectShyftInboundWebhookRouteKind = inferConnectShyftInboundWebhookRouteKind(req),
): Promise<ConnectShyftInboundWebhookAccessContext | null> => {
  if (!await enforceConnectShyftCapability(req, res, 'webhooks')) {
    return null;
  }

  const providerSelection = resolveConnectShyftProviderAdapter({
    req,
    operation: 'webhook',
    requestedProvider: resolveConnectShyftRequestedProviderKey(req),
  });
  if (!providerSelection.ok) {
    refusal(res, {
      code: providerSelection.refusal.code,
      message: providerSelection.refusal.message,
      refusalType: providerSelection.refusal.refusalType,
      httpStatus: providerSelection.refusal.httpStatus,
      data: providerSelection.refusal.data,
    });
    return null;
  }

  const signatureDecision = mapConnectShyftWebhookVerificationResult(
    providerSelection.adapter.verifyWebhook(
      buildConnectShyftWebhookVerificationInput({
        req,
        providerKey: providerSelection.providerResolution.resolvedProvider,
      }),
    ),
  );
  if (!signatureDecision.ok) {
    logger.warn('ConnectShyft inbound webhook signature validation failed', {
      routeKind,
      providerName: providerSelection.providerResolution.resolvedProvider,
      code: signatureDecision.refusal.code,
      httpStatus: signatureDecision.refusal.httpStatus,
    });
    const signatureMessageKey = signatureDecision.refusal.code === 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING'
      ? 'connectshyft.webhook.signature.missing'
      : signatureDecision.refusal.code === 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED'
        ? 'connectshyft.webhook.signature.not_configured'
        : 'connectshyft.webhook.signature.invalid';
    refusal(res, {
      code: signatureDecision.refusal.code,
      message: signatureDecision.refusal.message,
      refusalType: signatureDecision.refusal.refusalType,
      httpStatus: signatureDecision.refusal.httpStatus,
      data: {
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        signatureValidation: {
          deterministic: true,
          verified: false,
          provider: providerSelection.providerResolution.resolvedProvider,
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: signatureMessageKey,
          remediation: 'Ensure provider webhook signing is configured and include a valid signature.',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
    return null;
  }

  const canonicalTranslation = providerSelection.adapter.translateProviderEvent({
    rawEventType: normalizeString(req.body?.eventType) || 'sms.inbound',
    payload: req.body,
  });
  const eventType = canonicalTranslation.eventType;
  const normalizedEventType = eventType.toLowerCase();
  const correlation = await resolveInboundWebhookCorrelation({
    body: req.body,
    channelHint:
      normalizedEventType.includes('sms') || normalizedEventType.includes('message')
        ? 'sms'
        : 'voice',
    providerName: providerSelection.providerResolution.resolvedProvider,
    providerCorrelation: canonicalTranslation.correlation,
    tenantIdHint: req.tenantId || null,
  });
  if (!correlation.ok) {
    refusal(res, {
      code: correlation.code,
      message: correlation.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          ...providerSelection.providerResolution,
          adapterInvoked: true,
        },
        correlation: {
          deterministic: true,
          metadataFirstAttempted: true,
          fallbackLookupAttempted: true,
          reason: correlation.reason,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: 'connectshyft.webhook.correlation.unresolved',
          remediation: 'Retry with thread metadata or provider identifiers that map to a prior outbound dispatch.',
        },
        sideEffects: {
          lifecycleMutationApplied: false,
          canonicalEventPersisted: false,
          outboxPersisted: false,
        },
        timelineOutcome: {
          eventName: null,
          routingDecision: 'refused',
        },
      },
    });
    return null;
  }

  const tenantId = correlation.tenantId;
  const orgUnitId = correlation.orgUnitId;
  const threadId = correlation.threadId;
  const requestWithRawBody = req as Request & { rawBody?: Buffer | string };
  const rolloutContextValidation = resolveConnectShyftProviderAdapter({
    req: {
      header: (name: string) => req.header(name),
      body: req.body,
      rawBody: requestWithRawBody.rawBody,
      originalUrl: req.originalUrl,
      protocol: req.protocol,
      url: req.url,
      tenantId,
      orgUnitId,
    },
    operation: 'webhook',
    requestedProvider: providerSelection.providerResolution.resolvedProvider,
  });
  if (!rolloutContextValidation.ok) {
    refusal(res, {
      code: rolloutContextValidation.refusal.code,
      message: rolloutContextValidation.refusal.message,
      refusalType: rolloutContextValidation.refusal.refusalType,
      httpStatus: rolloutContextValidation.refusal.httpStatus,
      data: {
        ...(rolloutContextValidation.refusal.data || {}),
        correlation: {
          source: correlation.source,
          deterministic: true,
          threadId,
          tenantId,
          orgUnitId,
          providerLegId: correlation.providerLegId,
          providerMessageId: correlation.providerMessageId,
          providerEventId: correlation.providerEventId,
          providerNumberE164: correlation.providerNumberE164,
        },
      },
    });
    return null;
  }

  return {
    routeKind,
    providerSelection,
    canonicalTranslation,
    eventType,
    normalizedEventType,
    correlation,
    tenantId,
    orgUnitId,
    threadId,
  };
};

export const registerConnectShyftInboundWebhookCoreExecutor = (
  executor: ConnectShyftInboundWebhookCoreExecutor,
): void => {
  connectShyftInboundWebhookCoreExecutor = executor;
};

export const executeConnectShyftInboundWebhookRoute = async (
  req: Request,
  res: Response,
  routeKind: ConnectShyftInboundWebhookRouteKind = inferConnectShyftInboundWebhookRouteKind(req),
): Promise<void> => {
  const accessContext = await resolveConnectShyftInboundWebhookAccessContext(req, res, routeKind);
  if (!accessContext) {
    return;
  }

  if (!connectShyftInboundWebhookCoreExecutor) {
    throw new Error('ConnectShyft inbound webhook core executor is not registered.');
  }

  await connectShyftInboundWebhookCoreExecutor({
    req,
    res,
    ...accessContext,
  });
};
