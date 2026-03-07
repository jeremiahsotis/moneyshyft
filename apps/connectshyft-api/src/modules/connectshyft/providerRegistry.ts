import { createPublicKey, verify } from 'node:crypto';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';
import { sanitizeConnectShyftCanonicalPayload } from './canonicalEvents';

const DEFAULT_ENABLED_PROVIDERS = ['telnyx'];
const ENABLED_PROVIDERS_ENV = 'CONNECTSHYFT_ENABLED_PROVIDERS';
const DISABLED_PROVIDERS_ENV = 'CONNECTSHYFT_DISABLED_PROVIDERS';
const PROVIDER_ROLLOUT_ALLOWLIST_ENV = 'CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST';
const TEST_ENABLED_PROVIDERS_HEADER = 'x-test-connectshyft-enabled-providers';
const TEST_DISABLED_PROVIDERS_HEADER = 'x-test-connectshyft-disabled-providers';
const TEST_REQUESTED_PROVIDER_HEADER = 'x-test-connectshyft-provider-requested';
const TEST_PROVIDER_ROLLOUT_ALLOWLIST_HEADER = 'x-test-connectshyft-provider-rollout-allowlist';
const TEST_ENFORCE_WEBHOOK_SIGNATURE_HEADER = 'x-test-connectshyft-enforce-webhook-signature';
const TEST_TELNYX_PUBLIC_KEY_HEADER = 'x-test-connectshyft-telnyx-public-key';
const TELNYX_SIGNATURE_HEADER = 'telnyx-signature-ed25519';
const TELNYX_TIMESTAMP_HEADER = 'telnyx-timestamp';
const TELNYX_PUBLIC_KEY_ENV = 'TELNYX_PUBLIC_KEY';
const CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS_ENV = 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS';
const DEFAULT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS = 300;
const CONNECTSHYFT_REQUIRED_CALL_TRANSPORT = 'bridge';
const CONNECTSHYFT_REQUIRED_CALL_REDIAL_POLICY = 'manual_only';

export type ConnectShyftProviderOperation = 'call' | 'message' | 'webhook';
export type ConnectShyftProviderResolutionReason =
  | 'provider-disabled'
  | 'provider-not-allowlisted'
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
  providerLegId: string | null;
  providerMessageId: string | null;
  adapterInvoked: true;
  providerBranchingInDomain: false;
};

export type ConnectShyftOutboundCallDispatchPolicy = {
  transport: string;
  autoRetry: boolean;
  redialPolicy: string;
};

export class ConnectShyftProviderDispatchPolicyError extends Error {
  readonly code:
    | 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED'
    | 'CONNECTSHYFT_OUTBOUND_CALL_RETRY_FORBIDDEN';
  readonly data: Record<string, unknown>;

  constructor(input: {
    code:
      | 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED'
      | 'CONNECTSHYFT_OUTBOUND_CALL_RETRY_FORBIDDEN';
    message: string;
    data: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = 'ConnectShyftProviderDispatchPolicyError';
    this.code = input.code;
    this.data = input.data;
  }
}

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
  tenantId?: string | null;
  orgUnitId?: string | null;
};

type ConnectShyftProviderRolloutAllowlistRule = {
  tenantIds: string[];
  orgUnitIds: string[];
  tenantOrgUnitPairs: string[];
};

type ConnectShyftProviderRolloutAllowlist = Record<string, ConnectShyftProviderRolloutAllowlistRule>;

type ConnectShyftProviderRolloutAllowlistParseResult = {
  allowlist: ConnectShyftProviderRolloutAllowlist;
  configured: boolean;
  invalid: boolean;
};

export interface ConnectShyftProviderAdapter {
  providerKey: string;
  adapterInterfaceVersion: 'v1';
  dispatchOutboundCall(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    targetPhone?: string;
    callPolicy?: ConnectShyftOutboundCallDispatchPolicy;
  }): Promise<ConnectShyftProviderDispatchResult>;
  dispatchOutboundMessage(input: {
    tenantId: string;
    orgUnitId: string;
    threadId: string;
    body?: string;
    targetPhone?: string;
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

const parseNormalizedStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const resolved: string[] = [];
  value.forEach((entry) => {
    const normalized = normalizeString(entry);
    if (!normalized || resolved.includes(normalized)) {
      return;
    }
    resolved.push(normalized);
  });
  return resolved;
};

const resolveProviderRolloutAllowlist = (raw: unknown): ConnectShyftProviderRolloutAllowlistParseResult => {
  let candidate: unknown = raw;

  if (typeof candidate === 'string') {
    const normalized = candidate.trim();
    if (!normalized) {
      return {
        allowlist: {},
        configured: false,
        invalid: false,
      };
    }

    try {
      candidate = JSON.parse(normalized);
    } catch (_error) {
      return {
        allowlist: {},
        configured: true,
        invalid: true,
      };
    }
  }

  if (candidate === null || typeof candidate === 'undefined') {
    return {
      allowlist: {},
      configured: false,
      invalid: false,
    };
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      allowlist: {},
      configured: true,
      invalid: true,
    };
  }

  const resolved: ConnectShyftProviderRolloutAllowlist = {};
  let invalid = false;
  Object.entries(candidate as Record<string, unknown>).forEach(([providerKey, entry]) => {
    const normalizedProviderKey = normalizeProviderKey(providerKey);
    if (!normalizedProviderKey || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
      invalid = true;
      return;
    }

    const rule = entry as Record<string, unknown>;
    if (
      ('tenantIds' in rule && !Array.isArray(rule.tenantIds))
      || ('orgUnitIds' in rule && !Array.isArray(rule.orgUnitIds))
      || ('tenantOrgUnitPairs' in rule && !Array.isArray(rule.tenantOrgUnitPairs))
    ) {
      invalid = true;
      return;
    }
    resolved[normalizedProviderKey] = {
      tenantIds: parseNormalizedStringList(rule.tenantIds),
      orgUnitIds: parseNormalizedStringList(rule.orgUnitIds),
      tenantOrgUnitPairs: parseNormalizedStringList(rule.tenantOrgUnitPairs),
    };
  });

  return {
    allowlist: resolved,
    configured: true,
    invalid,
  };
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

const parseBooleanHeaderValue = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true'
    || normalized === '1'
    || normalized === 'on'
    || normalized === 'enabled';
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
  rolloutAllowlist: ConnectShyftProviderRolloutAllowlist;
  rolloutAllowlistConfigured: boolean;
  rolloutAllowlistInvalid: boolean;
} => {
  if (isConnectShyftTestOverrideEnabled()) {
    const rolloutAllowlist = resolveProviderRolloutAllowlist(
      req.header(TEST_PROVIDER_ROLLOUT_ALLOWLIST_HEADER),
    );
    const enabledProviders = parseProviderList(req.header(TEST_ENABLED_PROVIDERS_HEADER));
    const disabledProviders = parseProviderList(req.header(TEST_DISABLED_PROVIDERS_HEADER));
    return {
      enabledProviders: enabledProviders.length > 0 ? enabledProviders : [...DEFAULT_ENABLED_PROVIDERS],
      disabledProviders,
      rolloutAllowlist: rolloutAllowlist.allowlist,
      rolloutAllowlistConfigured: rolloutAllowlist.configured,
      rolloutAllowlistInvalid: rolloutAllowlist.invalid,
    };
  }

  const rolloutAllowlist = resolveProviderRolloutAllowlist(process.env[PROVIDER_ROLLOUT_ALLOWLIST_ENV]);
  return {
    enabledProviders: resolveProvidersFromEnv(ENABLED_PROVIDERS_ENV, DEFAULT_ENABLED_PROVIDERS),
    disabledProviders: resolveProvidersFromEnv(DISABLED_PROVIDERS_ENV),
    rolloutAllowlist: rolloutAllowlist.allowlist,
    rolloutAllowlistConfigured: rolloutAllowlist.configured,
    rolloutAllowlistInvalid: rolloutAllowlist.invalid,
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

const resolveRequestTenantOrgUnit = (
  req: ConnectShyftWebhookRequest,
): {
  tenantId: string;
  orgUnitId: string;
} => {
  const body = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : null;

  return {
    tenantId:
      normalizeString(req.tenantId)
      || normalizeString(body?.tenantId)
      || readHeader(req, 'x-test-connectshyft-tenant-id', 'x-tenant-id'),
    orgUnitId:
      normalizeString(req.orgUnitId)
      || normalizeString(body?.orgUnitId)
      || readHeader(req, 'x-test-connectshyft-orgunit-id', 'x-orgunit-id'),
  };
};

const isProviderAllowedByRolloutAllowlist = (input: {
  providerKey: string;
  req: ConnectShyftWebhookRequest;
  rolloutAllowlist: ConnectShyftProviderRolloutAllowlist;
  deferIfContextMissing: boolean;
}): boolean => {
  const rule = input.rolloutAllowlist[input.providerKey];
  if (!rule) {
    return true;
  }

  if (
    rule.tenantIds.length === 0
    && rule.orgUnitIds.length === 0
    && rule.tenantOrgUnitPairs.length === 0
  ) {
    return false;
  }

  const { tenantId, orgUnitId } = resolveRequestTenantOrgUnit(input.req);
  if (!tenantId && !orgUnitId) {
    return input.deferIfContextMissing;
  }

  const tenantOrgPair = tenantId && orgUnitId ? `${tenantId}::${orgUnitId}` : '';
  if (rule.tenantOrgUnitPairs.includes('*')) {
    return true;
  }
  if (tenantOrgPair && rule.tenantOrgUnitPairs.includes(tenantOrgPair)) {
    return true;
  }
  if (rule.tenantIds.includes('*') || (tenantId && rule.tenantIds.includes(tenantId))) {
    return true;
  }
  if (rule.orgUnitIds.includes('*') || (orgUnitId && rule.orgUnitIds.includes(orgUnitId))) {
    return true;
  }

  return false;
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

const shouldBypassWebhookSignatureValidation = (
  req: ConnectShyftWebhookRequest,
): boolean => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return false;
  }

  const enforceValidation = parseBooleanHeaderValue(
    readHeader(req, TEST_ENFORCE_WEBHOOK_SIGNATURE_HEADER),
  );
  return !enforceValidation;
};

const resolveTelnyxPublicKey = (
  req?: ConnectShyftWebhookRequest,
): ReturnType<typeof createPublicKey> | null => {
  if (req && isConnectShyftTestOverrideEnabled()) {
    const testPublicKey = readHeader(req, TEST_TELNYX_PUBLIC_KEY_HEADER);
    if (testPublicKey) {
      const candidateKeys = [testPublicKey];
      try {
        const decoded = Buffer.from(testPublicKey, 'base64').toString('utf8').trim();
        if (decoded && decoded !== testPublicKey) {
          candidateKeys.push(decoded);
        }
      } catch (_error) {
        // Ignore base64 decode failures and keep raw header candidate.
      }

      for (const candidate of candidateKeys) {
        try {
          return createPublicKey(candidate);
        } catch (_error) {
          // Try next candidate.
        }
      }
      return null;
    }
  }

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
  if (shouldBypassWebhookSignatureValidation(req)) {
    return { ok: true };
  }

  const telnyxPublicKey = resolveTelnyxPublicKey(req);
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
  input: {
    providerKey: string;
    channel: 'call' | 'message';
    threadId: string;
  },
): ConnectShyftProviderDispatchResult => ({
  providerKey: input.providerKey,
  channel: input.channel,
  providerLegId: input.channel === 'call'
    ? `${input.providerKey}-call-leg-${input.threadId}`
    : null,
  providerMessageId: input.channel === 'message'
    ? `${input.providerKey}-message-${input.threadId}`
    : null,
  adapterInvoked: true,
  providerBranchingInDomain: false,
});

const createAdapter = (input: {
  providerKey: string;
  validateInboundWebhookSignature?: (req: ConnectShyftWebhookRequest) => ConnectShyftWebhookSignatureResult;
}): ConnectShyftProviderAdapter => ({
  providerKey: input.providerKey,
  adapterInterfaceVersion: 'v1',
  async dispatchOutboundCall(dispatchInput) {
    const requestedTransport = normalizeString(dispatchInput.callPolicy?.transport).toLowerCase();
    if (
      requestedTransport.length > 0
      && requestedTransport !== CONNECTSHYFT_REQUIRED_CALL_TRANSPORT
    ) {
      throw new ConnectShyftProviderDispatchPolicyError({
        code: 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED',
        message: 'Outbound calls require bridge transport only.',
        data: {
          requestedTransport,
          allowedTransport: CONNECTSHYFT_REQUIRED_CALL_TRANSPORT,
        },
      });
    }

    const requestedRedialPolicy = normalizeString(dispatchInput.callPolicy?.redialPolicy).toLowerCase();
    const requestedAutoRetry = dispatchInput.callPolicy?.autoRetry === true;
    if (
      requestedAutoRetry
      || (
        requestedRedialPolicy.length > 0
        && requestedRedialPolicy !== CONNECTSHYFT_REQUIRED_CALL_REDIAL_POLICY
      )
    ) {
      throw new ConnectShyftProviderDispatchPolicyError({
        code: 'CONNECTSHYFT_OUTBOUND_CALL_RETRY_FORBIDDEN',
        message: 'Automatic redial/retry is disabled. Operators must re-initiate calls manually.',
        data: {
          requestedAutoRetry,
          requestedRedialPolicy: requestedRedialPolicy || null,
          allowedRedialPolicy: CONNECTSHYFT_REQUIRED_CALL_REDIAL_POLICY,
        },
      });
    }

    return buildDispatchResult({
      providerKey: input.providerKey,
      channel: 'call',
      threadId: dispatchInput.threadId,
    });
  },
  async dispatchOutboundMessage(dispatchInput) {
    return buildDispatchResult({
      providerKey: input.providerKey,
      channel: 'message',
      threadId: dispatchInput.threadId,
    });
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

  if (registryConfig.rolloutAllowlistConfigured && registryConfig.rolloutAllowlistInvalid) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      message: 'Provider rollout allow-list configuration is invalid. Cutover is fail-closed until corrected.',
      requestedProvider: requestedProvider || resolvedProvider,
      reason: 'provider-not-allowlisted',
    });
  }

  if (!isProviderAllowedByRolloutAllowlist({
    providerKey: resolvedProvider,
    req: input.req,
    rolloutAllowlist: registryConfig.rolloutAllowlist,
    deferIfContextMissing: input.operation === 'webhook',
  })) {
    return buildProviderResolutionRefusal({
      code: 'CONNECTSHYFT_PROVIDER_DISABLED',
      message: `Provider "${resolvedProvider}" is not allow-listed for this tenant/orgUnit cutover stage.`,
      requestedProvider: requestedProvider || resolvedProvider,
      reason: 'provider-not-allowlisted',
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
