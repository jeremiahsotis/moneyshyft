import { createPublicKey, verify } from 'node:crypto';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import { sanitizeConnectShyftCanonicalPayload } from './canonicalEvents';

const DEFAULT_ENABLED_PROVIDERS = ['telnyx'];
const ENABLED_PROVIDERS_ENV = 'CONNECTSHYFT_ENABLED_PROVIDERS';
const DISABLED_PROVIDERS_ENV = 'CONNECTSHYFT_DISABLED_PROVIDERS';
const TEST_ENABLED_PROVIDERS_HEADER = 'x-test-connectshyft-enabled-providers';
const TEST_DISABLED_PROVIDERS_HEADER = 'x-test-connectshyft-disabled-providers';
const TEST_REQUESTED_PROVIDER_HEADER = 'x-test-connectshyft-provider-requested';
const TELNYX_SIGNATURE_HEADER = 'telnyx-signature-ed25519';
const TELNYX_TIMESTAMP_HEADER = 'telnyx-timestamp';
const TELNYX_PUBLIC_KEY_ENV = 'TELNYX_PUBLIC_KEY';
const CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS_ENV = 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS';
const DEFAULT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS = 300;

export type ConnectShyftProviderOperation = 'call' | 'message' | 'webhook';
export type ConnectShyftProviderResolutionReason =
  | 'provider-disabled'
  | 'provider-not-registered'
  | 'no-enabled-provider';

export type ConnectShyftProviderResolution = {
  requestedProvider: string | null;
  resolvedProvider: string | null;
  deterministic: true;
  reason?: ConnectShyftProviderResolutionReason;
};

export type ConnectShyftProviderDispatchResult = {
  providerKey: string;
  channel: 'call' | 'message';
  adapterInvoked: true;
  providerBranchingInDomain: false;
};

export type ConnectShyftProviderCanonicalEvent = {
  eventType: string;
  payload: Record<string, unknown>;
  providerNeutral: true;
  providerSpecificFieldsStripped: true;
  providerBranchingInDomain: false;
};

export type ConnectShyftProviderSideEffectsContract = {
  dispatchAttempted: false;
  lifecycleMutationApplied: false;
  auditPersisted: false;
};

export type ConnectShyftProviderOperatorFeedbackMeta = {
  actionable: true;
  hiddenTransition: false;
  messageKey: 'connectshyft.provider.disabled' | 'connectshyft.provider.unavailable';
  remediation: string;
};

export type ConnectShyftProviderResolutionRefusal = {
  code: 'CONNECTSHYFT_PROVIDER_DISABLED' | 'CONNECTSHYFT_PROVIDER_UNAVAILABLE';
  message: string;
  refusalType: 'business';
  httpStatus: 200;
  data: {
    providerResolution: ConnectShyftProviderResolution;
    operatorFeedbackMeta: ConnectShyftProviderOperatorFeedbackMeta;
    sideEffects: ConnectShyftProviderSideEffectsContract;
  };
};

export type ConnectShyftWebhookSignatureRefusal = {
  code:
    | 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED'
    | 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING'
    | 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID';
  message: string;
  refusalType: 'business' | 'client';
  httpStatus: 401 | 503;
};

export type ConnectShyftWebhookSignatureResult =
  | { ok: true }
  | { ok: false; refusal: ConnectShyftWebhookSignatureRefusal };

type ConnectShyftHeaderValue = string | string[] | undefined;

type ConnectShyftHeaderReader = {
  header(name: string): ConnectShyftHeaderValue;
};

type ConnectShyftWebhookRequest = ConnectShyftHeaderReader & {
  body: unknown;
  rawBody?: Buffer | string;
  originalUrl?: string;
  protocol?: string;
  url?: string;
};

export interface ConnectShyftProviderAdapter {
  providerKey: string;
  adapterInterfaceVersion: 'v1';
  dispatchOutboundCall(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
  }): Promise<ConnectShyftProviderDispatchResult>;
  dispatchOutboundMessage(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
  }): Promise<ConnectShyftProviderDispatchResult>;
  validateInboundWebhookSignature(input: {
    req: ConnectShyftWebhookRequest;
  }): ConnectShyftWebhookSignatureResult;
  toCanonicalEvent(input: {
    rawEventType: string;
    payload: unknown;
  }): ConnectShyftProviderCanonicalEvent;
}

export type ConnectShyftProviderResolutionSuccess = {
  ok: true;
  adapter: ConnectShyftProviderAdapter;
  providerResolution: ConnectShyftProviderResolution & {
    resolvedProvider: string;
  };
};

export type ConnectShyftProviderResolutionFailure = {
  ok: false;
  refusal: ConnectShyftProviderResolutionRefusal;
};

export type ConnectShyftProviderResolutionResult =
  | ConnectShyftProviderResolutionSuccess
  | ConnectShyftProviderResolutionFailure;

const normalizeString = (value: unknown): string => {
  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => typeof entry === 'string');
    if (typeof firstValue === 'string') {
      return firstValue.trim();
    }
    return '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeProviderKey = (value: unknown): string | null => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const appendUnique = (target: string[], candidate: string | null): void => {
  if (!candidate || target.includes(candidate)) {
    return;
  }
  target.push(candidate);
};

const parseProviderList = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    const providers: string[] = [];
    raw.forEach((entry) => {
      appendUnique(providers, normalizeProviderKey(entry));
    });
    return providers;
  }

  if (typeof raw !== 'string') {
    return [];
  }

  if (!raw) {
    return [];
  }

  const normalizedRaw = raw.trim();
  if (!normalizedRaw) {
    return [];
  }

  const providers: string[] = [];

  const appendFromArray = (values: unknown[]): void => {
    values.forEach((value) => {
      appendUnique(providers, normalizeProviderKey(value));
    });
  };

  try {
    const parsed = JSON.parse(normalizedRaw);
    if (Array.isArray(parsed)) {
      appendFromArray(parsed);
      return providers;
    }
    appendUnique(providers, normalizeProviderKey(parsed));
    return providers;
  } catch (_error) {
    normalizedRaw
      .split(',')
      .map((value) => normalizeProviderKey(value))
      .forEach((value) => appendUnique(providers, value));
    return providers;
  }
};

const parseBooleanEnv = (value: string | undefined): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'true'
    || normalized === '1'
    || normalized === 'on'
    || normalized === 'enabled';
};

const parsePositiveInteger = (value: string | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const resolveProvidersFromEnv = (envVar: string, fallback: string[] = []): string[] => {
  const parsed = parseProviderList(process.env[envVar]);
  if (parsed.length > 0) {
    return parsed;
  }
  return [...fallback];
};

const resolveProviderRegistryConfig = (
  req: ConnectShyftHeaderReader,
): {
  enabledProviders: string[];
  disabledProviders: string[];
} => {
  if (isConnectShyftTestOverrideEnabled()) {
    const enabledProviders = parseProviderList(req.header(TEST_ENABLED_PROVIDERS_HEADER));
    const disabledProviders = parseProviderList(req.header(TEST_DISABLED_PROVIDERS_HEADER));
    return {
      enabledProviders: enabledProviders.length > 0 ? enabledProviders : [...DEFAULT_ENABLED_PROVIDERS],
      disabledProviders,
    };
  }

  return {
    enabledProviders: resolveProvidersFromEnv(ENABLED_PROVIDERS_ENV, DEFAULT_ENABLED_PROVIDERS),
    disabledProviders: resolveProvidersFromEnv(DISABLED_PROVIDERS_ENV),
  };
};

const buildProviderResolutionRefusal = (input: {
  code: ConnectShyftProviderResolutionRefusal['code'];
  message: string;
  requestedProvider: string | null;
  reason: ConnectShyftProviderResolutionReason;
}): ConnectShyftProviderResolutionFailure => {
  const isDisabled = input.code === 'CONNECTSHYFT_PROVIDER_DISABLED';

  return {
    ok: false,
    refusal: {
      code: input.code,
      message: input.message,
      refusalType: 'business',
      httpStatus: 200,
      data: {
        providerResolution: {
          requestedProvider: input.requestedProvider,
          resolvedProvider: null,
          deterministic: true,
          reason: input.reason,
        },
        operatorFeedbackMeta: {
          actionable: true,
          hiddenTransition: false,
          messageKey: isDisabled
            ? 'connectshyft.provider.disabled'
            : 'connectshyft.provider.unavailable',
          remediation: isDisabled
            ? 'Choose an enabled provider and retry the comms action.'
            : 'Select a registered enabled provider and retry.',
        },
        sideEffects: {
          dispatchAttempted: false,
          lifecycleMutationApplied: false,
          auditPersisted: false,
        },
      },
    },
  };
};

const readHeader = (req: ConnectShyftHeaderReader, ...names: string[]): string => {
  for (const name of names) {
    const resolved = normalizeString(req.header(name));
    if (resolved) {
      return resolved;
    }
  }

  return '';
};

const resolveWebhookPayloadForSignature = (req: ConnectShyftWebhookRequest): string => {
  if (typeof req.rawBody === 'string') {
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody.toString('utf8');
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  if (!req.body || typeof req.body !== 'object') {
    return '';
  }

  try {
    return JSON.stringify(req.body);
  } catch (_error) {
    return '';
  }
};

const parseTelnyxSignatureHeader = (header: string): Buffer | null => {
  const normalized = normalizeString(header);
  if (!normalized) {
    return null;
  }

  if (/^[a-f0-9]+$/i.test(normalized) && normalized.length % 2 === 0) {
    return Buffer.from(normalized, 'hex');
  }

  try {
    const parsed = Buffer.from(normalized, 'base64');
    return parsed.length > 0 ? parsed : null;
  } catch (_error) {
    return null;
  }
};

const parseWebhookTimestampMs = (timestamp: string): number | null => {
  const normalized = normalizeString(timestamp);
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  // Telnyx sends unix seconds; tolerate millisecond epoch values if configured upstream.
  return parsed > 1_000_000_000_000 ? parsed : parsed * 1000;
};

const resolveWebhookSignatureMaxAgeMs = (): number => {
  const configured = parsePositiveInteger(
    process.env[CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS_ENV],
  );
  return (configured ?? DEFAULT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS) * 1000;
};

const resolveTelnyxPublicKey = (): ReturnType<typeof createPublicKey> | null => {
  const rawKey = normalizeString(process.env[TELNYX_PUBLIC_KEY_ENV]);
  if (!rawKey) {
    return null;
  }

  try {
    return createPublicKey(rawKey);
  } catch (_error) {
    return null;
  }
};

const validateTelnyxWebhookSignature = (
  req: ConnectShyftWebhookRequest,
): ConnectShyftWebhookSignatureResult => {
  if (isConnectShyftTestOverrideEnabled()) {
    return { ok: true };
  }

  const telnyxPublicKey = resolveTelnyxPublicKey();
  if (!telnyxPublicKey) {
    return {
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED',
        message: 'Webhook signature validation is not configured for Telnyx.',
        refusalType: 'business',
        httpStatus: 503,
      },
    };
  }

  const incomingSignature = readHeader(
    req,
    TELNYX_SIGNATURE_HEADER,
    `x-${TELNYX_SIGNATURE_HEADER}`,
  );
  const incomingTimestamp = readHeader(
    req,
    TELNYX_TIMESTAMP_HEADER,
    `x-${TELNYX_TIMESTAMP_HEADER}`,
  );
  if (!incomingSignature || !incomingTimestamp) {
    return {
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING',
        message: 'Telnyx webhook signature headers are required.',
        refusalType: 'client',
        httpStatus: 401,
      },
    };
  }

  const parsedSignature = parseTelnyxSignatureHeader(incomingSignature);
  if (!parsedSignature) {
    return {
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature validation failed.',
        refusalType: 'client',
        httpStatus: 401,
      },
    };
  }

  const signedPayload = Buffer.from(
    `${incomingTimestamp}|${resolveWebhookPayloadForSignature(req)}`,
    'utf8',
  );
  let isValidSignature = false;
  try {
    isValidSignature = verify(
      null,
      signedPayload,
      telnyxPublicKey,
      parsedSignature,
    );
  } catch (_error) {
    isValidSignature = false;
  }

  if (!isValidSignature) {
    return {
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature validation failed.',
        refusalType: 'client',
        httpStatus: 401,
      },
    };
  }

  const webhookTimestampMs = parseWebhookTimestampMs(incomingTimestamp);
  const maxAgeMs = resolveWebhookSignatureMaxAgeMs();
  if (!webhookTimestampMs || Math.abs(Date.now() - webhookTimestampMs) > maxAgeMs) {
    return {
      ok: false,
      refusal: {
        code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature timestamp is outside the allowed replay window.',
        refusalType: 'client',
        httpStatus: 401,
      },
    };
  }

  return { ok: true };
};

const toCanonicalEventType = (rawEventType: string): string => {
  const normalized = normalizeString(rawEventType).toLowerCase();
  if (!normalized) {
    return 'MessageQueued';
  }

  if (normalized === 'call.connected' || normalized === 'voice.connected') {
    return 'CallConnected';
  }

  if (normalized === 'call.attempt.started' || normalized === 'voice.started') {
    return 'CallAttemptStarted';
  }

  if (normalized === 'message.delivered' || normalized === 'sms.delivered') {
    return 'MessageDelivered';
  }

  if (normalized === 'message.sent' || normalized === 'sms.sent') {
    return 'MessageSent';
  }

  if (normalized === 'message.queued' || normalized === 'sms.inbound') {
    return 'MessageQueued';
  }

  return normalized
    .split(/[._-]+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : '')
    .join('') || 'MessageQueued';
};

const buildDispatchResult = (
  providerKey: string,
  channel: 'call' | 'message',
): ConnectShyftProviderDispatchResult => ({
  providerKey,
  channel,
  adapterInvoked: true,
  providerBranchingInDomain: false,
});

const createAdapter = (input: {
  providerKey: string;
  validateInboundWebhookSignature?: (req: ConnectShyftWebhookRequest) => ConnectShyftWebhookSignatureResult;
}): ConnectShyftProviderAdapter => ({
  providerKey: input.providerKey,
  adapterInterfaceVersion: 'v1',
  async dispatchOutboundCall(_dispatchInput) {
    return buildDispatchResult(input.providerKey, 'call');
  },
  async dispatchOutboundMessage(_dispatchInput) {
    return buildDispatchResult(input.providerKey, 'message');
  },
  validateInboundWebhookSignature({ req }) {
    if (input.validateInboundWebhookSignature) {
      return input.validateInboundWebhookSignature(req);
    }
    return { ok: true };
  },
  toCanonicalEvent({ rawEventType, payload }) {
    return {
      eventType: toCanonicalEventType(rawEventType),
      payload: sanitizeConnectShyftCanonicalPayload(payloadToRecord(payload)),
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    };
  },
});

const payloadToRecord = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return payload as Record<string, unknown>;
};

const PROVIDER_ADAPTERS: Record<string, ConnectShyftProviderAdapter> = {
  telnyx: createAdapter({
    providerKey: 'telnyx',
    validateInboundWebhookSignature: validateTelnyxWebhookSignature,
  }),
  'mock-sandbox': createAdapter({
    providerKey: 'mock-sandbox',
  }),
};

export const resolveConnectShyftRequestedProviderKey = (
  req: ConnectShyftHeaderReader & { body: unknown },
): string | null => {
  const body = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : null;
  const requestedFromBody =
    normalizeProviderKey(body?.providerKey)
    || normalizeProviderKey(body?.provider);
  if (requestedFromBody) {
    return requestedFromBody;
  }

  if (isConnectShyftTestOverrideEnabled()) {
    return normalizeProviderKey(req.header(TEST_REQUESTED_PROVIDER_HEADER));
  }

  return null;
};

export const resolveConnectShyftProviderAdapter = (input: {
  req: ConnectShyftWebhookRequest;
  requestedProvider?: string | null;
  operation: ConnectShyftProviderOperation;
}): ConnectShyftProviderResolutionResult => {
  const requestedProvider =
    normalizeProviderKey(input.requestedProvider)
    || resolveConnectShyftRequestedProviderKey(input.req);

  const registryConfig = resolveProviderRegistryConfig(input.req);
  const disabledProviderSet = new Set(registryConfig.disabledProviders);
  const enabledProviders = [...registryConfig.enabledProviders];
  const eligibleEnabledProviders = enabledProviders.filter(
    (provider) => !disabledProviderSet.has(provider),
  );

  const resolvedProvider = requestedProvider || eligibleEnabledProviders[0] || null;
  if (!resolvedProvider) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      message: 'No enabled comms provider is configured for this operation.',
      requestedProvider: requestedProvider,
      reason: 'no-enabled-provider',
    });
  }

  if (disabledProviderSet.has(resolvedProvider)) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      message: `Provider "${resolvedProvider}" is disabled for this comms action.`,
      requestedProvider: requestedProvider || resolvedProvider,
      reason: 'provider-disabled',
    });
  }

  if (!enabledProviders.includes(resolvedProvider)) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      message: `Provider "${resolvedProvider}" is not registered in enabled provider policy.`,
      requestedProvider: requestedProvider || resolvedProvider,
      reason: 'provider-not-registered',
    });
  }

  const adapter = PROVIDER_ADAPTERS[resolvedProvider];
  if (!adapter) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_UNAVAILABLE',
      message: `Provider "${resolvedProvider}" does not have a registered adapter.`,
      requestedProvider: requestedProvider || resolvedProvider,
      reason: 'provider-not-registered',
    });
  }

  return {
    ok: true,
    adapter,
    providerResolution: {
      requestedProvider: requestedProvider || resolvedProvider,
      resolvedProvider,
      deterministic: true,
    },
  };
};

export const isConnectShyftProviderRegistryTestModeEnabled = (): boolean =>
  parseBooleanEnv(process.env.ENABLE_TEST_CONNECTSHYFT_FLAGS) && process.env.NODE_ENV === 'test';
