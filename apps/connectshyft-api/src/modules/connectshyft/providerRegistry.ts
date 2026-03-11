import {
  assertValidCallDispatchResult,
  assertValidSmsDispatchResult,
  type TelephonyDispatchResult,
  type TelephonyOutboundCallPolicy,
  type TelephonyProviderAdapter,
  type TelephonyProviderEvent,
  type TelephonyWebhookVerificationInput,
  type TelephonyWebhookVerificationResult,
} from '../../../../../domains/communication';
import { createTelnyxAdapter } from '../../../../../infrastructure/communications/telnyx';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';

const DEFAULT_ENABLED_PROVIDERS = ['telnyx'];
const ENABLED_PROVIDERS_ENV = 'CONNECTSHYFT_ENABLED_PROVIDERS';
const DISABLED_PROVIDERS_ENV = 'CONNECTSHYFT_DISABLED_PROVIDERS';
const PROVIDER_ROLLOUT_ALLOWLIST_ENV = 'CONNECTSHYFT_PROVIDER_ROLLOUT_ALLOWLIST';
const TEST_ENABLED_PROVIDERS_HEADER = 'x-test-connectshyft-enabled-providers';
const TEST_DISABLED_PROVIDERS_HEADER = 'x-test-connectshyft-disabled-providers';
const TEST_REQUESTED_PROVIDER_HEADER = 'x-test-connectshyft-provider-requested';
const TEST_PROVIDER_ROLLOUT_ALLOWLIST_HEADER = 'x-test-connectshyft-provider-rollout-allowlist';
const TEST_ENFORCE_WEBHOOK_SIGNATURE_HEADER = 'x-test-connectshyft-enforce-webhook-signature';
const CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS_ENV = 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS';
const TEST_PROVIDER_PUBLIC_KEY_HEADER = 'x-test-connectshyft-provider-public-key';
const TEST_PROVIDER_PUBLIC_KEY_LEGACY_HEADER = 'x-test-connectshyft-telnyx-public-key';
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

export type ConnectShyftProviderDispatchResult = TelephonyDispatchResult;

export type ConnectShyftOutboundCallDispatchPolicy = TelephonyOutboundCallPolicy;

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

export type ConnectShyftProviderCanonicalEvent = TelephonyProviderEvent;

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
  headers?: Record<string, unknown>;
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

export type ConnectShyftProviderAdapter = TelephonyProviderAdapter;

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

const payloadToRecord = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return payload as Record<string, unknown>;
};

const toCanonicalEventType = (rawEventType: string): string => {
  const normalized = normalizeString(rawEventType).toLowerCase();
  if (!normalized) {
    return 'MessageQueued';
  }

  if (normalized === 'call.connected' || normalized === 'voice.connected') {
    return 'CallConnected';
  }

  if (normalized === 'call.attempt.started' || normalized === 'call.initiated') {
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
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : ''))
    .join('') || 'MessageQueued';
};

const collectWebhookHeaders = (
  req: ConnectShyftWebhookRequest,
): TelephonyWebhookVerificationInput['headers'] => {
  const collected: TelephonyWebhookVerificationInput['headers'] = {};

  if (req.headers && typeof req.headers === 'object') {
    Object.entries(req.headers).forEach(([name, value]) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        collected[name.toLowerCase()] = value;
      }
    });
  }

  [
    TEST_ENFORCE_WEBHOOK_SIGNATURE_HEADER,
    TEST_PROVIDER_PUBLIC_KEY_HEADER,
    TEST_PROVIDER_PUBLIC_KEY_LEGACY_HEADER,
  ].forEach((headerName) => {
    const value = req.header(headerName);
    if (typeof value === 'string' && value.trim().length > 0) {
      collected[headerName.toLowerCase()] = value;
    }
  });

  return collected;
};

export const buildConnectShyftWebhookVerificationInput = (input: {
  req: ConnectShyftWebhookRequest;
  providerKey: string;
}): TelephonyWebhookVerificationInput => ({
  providerKey: input.providerKey,
  headers: collectWebhookHeaders(input.req),
  rawBody: input.req.rawBody,
  payload: input.req.body,
  requestPath: input.req.originalUrl || input.req.url,
  protocol: input.req.protocol,
  verification: {
    enforceValidation: !shouldBypassWebhookSignatureValidation(input.req),
    publicKeyPem: readHeader(
      input.req,
      TEST_PROVIDER_PUBLIC_KEY_HEADER,
      TEST_PROVIDER_PUBLIC_KEY_LEGACY_HEADER,
    ) || null,
    maxAgeSeconds: parsePositiveInteger(
      process.env[CONNECTSHYFT_WEBHOOK_SIGNATURE_MAX_AGE_SECONDS_ENV],
    ),
  },
});

export const mapConnectShyftWebhookVerificationResult = (
  result: TelephonyWebhookVerificationResult,
): ConnectShyftWebhookSignatureResult => {
  if (result.ok) {
    return result;
  }

  const refusalCode = result.refusal.code === 'WEBHOOK_SIGNATURE_NOT_CONFIGURED'
    ? 'CONNECTSHYFT_WEBHOOK_SIGNATURE_NOT_CONFIGURED'
    : result.refusal.code === 'WEBHOOK_SIGNATURE_MISSING'
      ? 'CONNECTSHYFT_WEBHOOK_SIGNATURE_MISSING'
      : 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID';

  return {
    ok: false,
    refusal: {
      code: refusalCode,
      message: result.refusal.message,
      refusalType: result.refusal.refusalType,
      httpStatus: result.refusal.httpStatus,
    },
  };
};

const buildMockSandboxAdapter = (
  providerKey: string,
): ConnectShyftProviderAdapter => ({
  providerKey,
  adapterInterfaceVersion: 'v1',
  async sendSms(command) {
    return assertValidSmsDispatchResult({
      providerKey,
      channel: 'message',
      providerLegId: null,
      providerMessageId: `${providerKey}-message-${command.threadId}`,
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });
  },
  async startOutboundCall(command) {
    return assertValidCallDispatchResult({
      providerKey,
      channel: 'call',
      providerLegId: `${providerKey}-call-leg-${command.threadId}`,
      providerMessageId: null,
      adapterInvoked: true,
      providerBranchingInDomain: false,
    });
  },
  verifyWebhook(input) {
    if (input.verification?.enforceValidation === false) {
      return { ok: true };
    }
    return { ok: true };
  },
  translateProviderEvent({ rawEventType, payload }) {
    return {
      eventType: toCanonicalEventType(rawEventType),
      payload: payloadToRecord(payload),
      providerNeutral: true,
      providerSpecificFieldsStripped: true,
      providerBranchingInDomain: false,
    };
  },
});

const createGuardrailedAdapter = (
  baseAdapter: TelephonyProviderAdapter,
): ConnectShyftProviderAdapter => ({
  providerKey: baseAdapter.providerKey,
  adapterInterfaceVersion: baseAdapter.adapterInterfaceVersion,
  async sendSms(command) {
    return baseAdapter.sendSms(command);
  },
  async startOutboundCall(command) {
    const requestedTransport = normalizeString(command.callPolicy?.transport).toLowerCase();
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

    const requestedRedialPolicy = normalizeString(command.callPolicy?.redialPolicy).toLowerCase();
    const requestedAutoRetry = command.callPolicy?.autoRetry === true;
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

    return baseAdapter.startOutboundCall(command);
  },
  verifyWebhook(input) {
    return baseAdapter.verifyWebhook(input);
  },
  translateProviderEvent(input) {
    return baseAdapter.translateProviderEvent(input);
  },
});

const resolveProviderAdapter = (
  providerKey: string,
): ConnectShyftProviderAdapter | null => {
  if (providerKey === 'telnyx') {
    return createGuardrailedAdapter(createTelnyxAdapter());
  }

  if (providerKey === 'mock-sandbox') {
    return createGuardrailedAdapter(buildMockSandboxAdapter(providerKey));
  }

  return null;
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

  const adapter = resolveProviderAdapter(resolvedProvider);
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
