import { Request } from 'express';

export type ConnectShyftFeatureFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

export type ConnectShyftCapability = 'module' | 'inbox' | 'escalation' | 'webhooks';

export type ConnectShyftEntitlementInput = {
  moduleEnabled: boolean;
};

export type ConnectShyftCapabilityEvaluation =
  | { ok: true }
  | {
    ok: false;
    code: string;
    message: string;
    refusalType: 'business';
  };

type ConnectShyftRefusalEvaluation = Extract<ConnectShyftCapabilityEvaluation, { ok: false }>;

const CONNECTSHYFT_TEST_FLAGS_HEADER = 'x-test-connectshyft-flags';
const ENABLE_TEST_CONNECTSHYFT_FLAGS_ENV = 'ENABLE_TEST_CONNECTSHYFT_FLAGS';
const CONNECTSHYFT_FLAG_ENV_MAP: Record<keyof ConnectShyftFeatureFlags, string> = {
  connectshyft_enabled: 'CONNECTSHYFT_ENABLED',
  connectshyft_inbox_enabled: 'CONNECTSHYFT_INBOX_ENABLED',
  connectshyft_escalation_enabled: 'CONNECTSHYFT_ESCALATION_ENABLED',
  connectshyft_webhooks_enabled: 'CONNECTSHYFT_WEBHOOKS_ENABLED',
};

const DEFAULT_CONNECTSHYFT_FLAGS: ConnectShyftFeatureFlags = {
  connectshyft_enabled: true,
  connectshyft_inbox_enabled: true,
  connectshyft_escalation_enabled: true,
  connectshyft_webhooks_enabled: true,
};

const MODULE_DISABLED_RESPONSE: Omit<ConnectShyftRefusalEvaluation, 'ok'> = {
  code: 'CONNECTSHYFT_MODULE_DISABLED',
  message: 'ConnectShyft is currently unavailable for this tenant. Enable connectshyft_enabled to access this module.',
  refusalType: 'business',
};

const CAPABILITY_DISABLED_RESPONSES: Record<
  Exclude<ConnectShyftCapability, 'module'>,
  Omit<ConnectShyftRefusalEvaluation, 'ok'>
> = {
  inbox: {
    code: 'CONNECTSHYFT_INBOX_CAPABILITY_DISABLED',
    message: 'ConnectShyft inbox is currently unavailable for this tenant.',
    refusalType: 'business',
  },
  escalation: {
    code: 'CONNECTSHYFT_ESCALATION_CAPABILITY_DISABLED',
    message: 'Escalation controls are temporarily unavailable for this tenant.',
    refusalType: 'business',
  },
  webhooks: {
    code: 'CONNECTSHYFT_WEBHOOKS_DISABLED',
    message: 'Inbound webhook processing is unavailable for this tenant.',
    refusalType: 'business',
  },
};

const normalizeFlag = (value: unknown): boolean => value === true;

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

const parseOptionalBooleanEnv = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') {
    return null;
  }
  return parseBooleanEnv(value);
};

const isNodeTestEnv = (): boolean => process.env.NODE_ENV?.trim().toLowerCase() === 'test';

const parseFlags = (raw: unknown): ConnectShyftFeatureFlags => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONNECTSHYFT_FLAGS };
  }

  const candidate = raw as Partial<ConnectShyftFeatureFlags>;
  return {
    connectshyft_enabled: normalizeFlag(candidate.connectshyft_enabled),
    connectshyft_inbox_enabled: normalizeFlag(candidate.connectshyft_inbox_enabled),
    connectshyft_escalation_enabled: normalizeFlag(candidate.connectshyft_escalation_enabled),
    connectshyft_webhooks_enabled: normalizeFlag(candidate.connectshyft_webhooks_enabled),
  };
};

const resolveServerConnectShyftFeatureFlags = (): ConnectShyftFeatureFlags => ({
  connectshyft_enabled:
    parseOptionalBooleanEnv(process.env[CONNECTSHYFT_FLAG_ENV_MAP.connectshyft_enabled])
    ?? DEFAULT_CONNECTSHYFT_FLAGS.connectshyft_enabled,
  connectshyft_inbox_enabled:
    parseOptionalBooleanEnv(process.env[CONNECTSHYFT_FLAG_ENV_MAP.connectshyft_inbox_enabled])
    ?? DEFAULT_CONNECTSHYFT_FLAGS.connectshyft_inbox_enabled,
  connectshyft_escalation_enabled:
    parseOptionalBooleanEnv(process.env[CONNECTSHYFT_FLAG_ENV_MAP.connectshyft_escalation_enabled])
    ?? DEFAULT_CONNECTSHYFT_FLAGS.connectshyft_escalation_enabled,
  connectshyft_webhooks_enabled:
    parseOptionalBooleanEnv(process.env[CONNECTSHYFT_FLAG_ENV_MAP.connectshyft_webhooks_enabled])
    ?? DEFAULT_CONNECTSHYFT_FLAGS.connectshyft_webhooks_enabled,
});

export const isConnectShyftTestOverrideEnabled = (): boolean =>
  parseBooleanEnv(process.env[ENABLE_TEST_CONNECTSHYFT_FLAGS_ENV]) && isNodeTestEnv();

const parseTestFlagOverride = (req: Pick<Request, 'header'>): ConnectShyftFeatureFlags | null => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return null;
  }

  const rawHeader = req.header(CONNECTSHYFT_TEST_FLAGS_HEADER);
  if (!rawHeader) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawHeader);
    return parseFlags(parsed);
  } catch (_error) {
    return null;
  }
};

export const resolveConnectShyftFeatureFlags = (
  req: Pick<Request, 'header'>,
): ConnectShyftFeatureFlags => {
  const testOverride = parseTestFlagOverride(req);
  if (testOverride) {
    return testOverride;
  }

  return resolveServerConnectShyftFeatureFlags();
};

export const mergeConnectShyftFlagsWithEntitlement = (
  flags: ConnectShyftFeatureFlags,
  entitlement: ConnectShyftEntitlementInput | null
): ConnectShyftFeatureFlags => {
  if (!entitlement) {
    return { ...flags };
  }

  const moduleEnabled = entitlement.moduleEnabled;
  if (!moduleEnabled) {
    return {
      connectshyft_enabled: false,
      connectshyft_inbox_enabled: false,
      connectshyft_escalation_enabled: false,
      connectshyft_webhooks_enabled: false,
    };
  }

  return {
    connectshyft_enabled: true,
    connectshyft_inbox_enabled: flags.connectshyft_inbox_enabled,
    connectshyft_escalation_enabled: flags.connectshyft_escalation_enabled,
    connectshyft_webhooks_enabled: flags.connectshyft_webhooks_enabled,
  };
};

export const evaluateConnectShyftCapability = (
  flags: ConnectShyftFeatureFlags,
  capability: ConnectShyftCapability,
): ConnectShyftCapabilityEvaluation => {
  if (!flags.connectshyft_enabled) {
    return { ok: false, ...MODULE_DISABLED_RESPONSE };
  }

  if (capability === 'module') {
    return { ok: true };
  }

  const isEnabledByCapability: Record<Exclude<ConnectShyftCapability, 'module'>, boolean> = {
    inbox: flags.connectshyft_inbox_enabled,
    escalation: flags.connectshyft_escalation_enabled,
    webhooks: flags.connectshyft_webhooks_enabled,
  };

  if (isEnabledByCapability[capability]) {
    return { ok: true };
  }

  return {
    ok: false,
    ...CAPABILITY_DISABLED_RESPONSES[capability],
  };
};
