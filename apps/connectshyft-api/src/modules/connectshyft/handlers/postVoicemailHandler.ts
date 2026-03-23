import type { Request, RequestHandler } from 'express';
import { error, refusal, success } from '../../../platform/envelopes/response';
import {
  buildConnectShyftWebhookVerificationInput,
  mapConnectShyftWebhookVerificationResult,
  resolveConnectShyftProviderAdapter,
  resolveConnectShyftRequestedProviderKey,
} from '../providerRegistry';
import {
  connectShyftCallLifecycleServiceAsync,
  ConnectShyftCallLifecycleRefusalError,
  type ConnectShyftCallLifecycleService,
} from '../callLifecycle';
import { ConnectShyftPersistenceUnavailableError } from '../calls';
import { enforceConnectShyftCapability } from '../http/accessContext';

type PostVoicemailHandlerDependencies = {
  callLifecycleService?: ConnectShyftCallLifecycleService;
  enforceCapability?: typeof enforceConnectShyftCapability;
  resolveProviderAdapterFn?: typeof resolveConnectShyftProviderAdapter;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const resolveOccurredAt = (req: Request): Date => {
  const normalized = normalizeString(req.body?.occurredAt || req.body?.occurred_at);
  if (!normalized) {
    return new Date();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
};

export const buildPostVoicemailHandler = (
  dependencies: PostVoicemailHandlerDependencies = {},
): RequestHandler => {
  const callLifecycleService =
    dependencies.callLifecycleService || connectShyftCallLifecycleServiceAsync;
  const enforceCapability =
    dependencies.enforceCapability || enforceConnectShyftCapability;
  const resolveProviderAdapterFn =
    dependencies.resolveProviderAdapterFn || resolveConnectShyftProviderAdapter;

  return async (req, res) => {
    if (!await enforceCapability(req, res, 'webhooks')) {
      return;
    }

    const tenantId = normalizeString(req.body?.tenantId) || normalizeString(req.tenantId);
    const orgUnitId = normalizeString(req.body?.orgUnitId) || normalizeString(req.orgUnitId);
    const callId = normalizeString(req.body?.callId);
    const threadId = normalizeString(req.body?.threadId);
    const personId = normalizeString(req.body?.personId);
    const artifactId = normalizeString(req.body?.artifactId);
    const recordingStatus = normalizeString(req.body?.recordingStatus) as
      | 'pending'
      | 'completed'
      | 'failed';

    if (!tenantId || !orgUnitId || !callId || !threadId || !personId || !artifactId) {
      refusal(res, {
        code: 'CONNECTSHYFT_VOICEMAIL_FIELDS_REQUIRED',
        message: 'tenantId, orgUnitId, callId, threadId, personId, and artifactId are required.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    if (recordingStatus !== 'pending' && recordingStatus !== 'completed' && recordingStatus !== 'failed') {
      refusal(res, {
        code: 'CONNECTSHYFT_VOICEMAIL_STATUS_INVALID',
        message: 'recordingStatus must be one of pending, completed, or failed.',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const providerResolution = resolveProviderAdapterFn({
      req: {
        header: (name: string) => req.header(name),
        body: req.body && typeof req.body === 'object'
          ? req.body as Record<string, unknown>
          : {},
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value)
              ? value[0] || ''
              : typeof value === 'string'
                ? value
                : '',
          ]),
        ),
        originalUrl: req.originalUrl,
        protocol: req.protocol,
        rawBody: (req as Request & { rawBody?: Buffer | string }).rawBody,
        tenantId,
        orgUnitId,
      },
      requestedProvider: resolveConnectShyftRequestedProviderKey(req),
      operation: 'webhook',
    });
    if (!providerResolution.ok) {
      refusal(res, {
        code: providerResolution.refusal.code,
        message: providerResolution.refusal.message,
        refusalType: providerResolution.refusal.refusalType,
        httpStatus: providerResolution.refusal.httpStatus,
        data: providerResolution.refusal.data,
      });
      return;
    }

    const signatureDecision = mapConnectShyftWebhookVerificationResult(
      providerResolution.adapter.verifyWebhook(
        buildConnectShyftWebhookVerificationInput({
          req,
          providerKey: providerResolution.providerResolution.resolvedProvider,
        }),
      ),
    );
    if (!signatureDecision.ok) {
      refusal(res, {
        code: signatureDecision.refusal.code,
        message: signatureDecision.refusal.message,
        refusalType: signatureDecision.refusal.refusalType,
        httpStatus: signatureDecision.refusal.httpStatus,
      });
      return;
    }

    try {
      const voicemail = await callLifecycleService.handleVoicemail({
        tenantId,
        orgUnitId,
        callId,
        threadId,
        personId,
        artifactId,
        recordingUrl: normalizeString(req.body?.recordingUrl) || null,
        recordingStatus,
        occurredAt: resolveOccurredAt(req),
        transcriptionJson: req.body?.transcriptionJson ?? req.body?.transcription_json ?? null,
      });

      success(res, {
        code: 'CONNECTSHYFT_VOICEMAIL_ACCEPTED',
        message: 'Voicemail accepted.',
        data: {
          voicemail: {
            voicemailId: voicemail.id,
            callId: voicemail.callId,
            threadId: voicemail.threadId,
            personId: voicemail.personId,
            artifactId: voicemail.artifactId,
            recordingUrl: voicemail.recordingUrl,
            recordingStatus: voicemail.recordingStatus,
            occurredAtUtc: voicemail.occurredAtUtc,
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

export const postVoicemailHandler = buildPostVoicemailHandler();
