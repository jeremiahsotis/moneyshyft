import api from '@/services/api';

export type ConnectShyftUiFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type ConnectShyftAvailabilityEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  refusalType?: 'business' | 'security' | 'client' | 'system';
  data?: {
    flags?: Partial<ConnectShyftUiFlags>;
    entitlement?: {
      moduleKey?: string;
      enabled?: boolean;
      reason?: string;
    } | null;
    capabilities?: {
      module?: boolean;
      inbox?: boolean;
      escalation?: boolean;
      webhooks?: boolean;
    };
  };
};

export type ConnectShyftAvailabilityState = {
  flags: ConnectShyftUiFlags;
  entitlement: {
    moduleKey: string;
    enabled: boolean;
    reason: string;
  } | null;
  capabilities: {
    module: boolean;
    inbox: boolean;
    escalation: boolean;
    webhooks: boolean;
  };
  refusal: {
    code: string;
    message: string;
    refusalType: 'business' | 'security' | 'client' | 'system';
  } | null;
};

type ParsedConnectShyftContextOverride = {
  tenantId: string | null;
  orgUnitId: string | null;
  role: string | null;
  userId: string | null;
  requestedProvider: string | null;
  orgUnitMemberships: string[];
  activeThreadNeighborIds: string[];
};

export const DEFAULT_CONNECTSHYFT_UI_FLAGS: ConnectShyftUiFlags = {
  connectshyft_enabled: false,
  connectshyft_inbox_enabled: false,
  connectshyft_escalation_enabled: false,
  connectshyft_webhooks_enabled: false,
};

export const DEFAULT_CONNECTSHYFT_AVAILABILITY: ConnectShyftAvailabilityState = {
  flags: { ...DEFAULT_CONNECTSHYFT_UI_FLAGS },
  entitlement: null,
  capabilities: {
    module: false,
    inbox: false,
    escalation: false,
    webhooks: false,
  },
  refusal: null,
};

const isConnectShyftTestHarnessEnabled = (): boolean =>
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS === 'true';

const normalizeDeterministicPhoneSeed = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildDeterministicTestPhone = (seed: string): string => {
  let digits = '';
  for (const char of seed) {
    if (digits.length >= 10) {
      break;
    }
    digits += String(char.charCodeAt(0) % 10);
  }

  const paddedDigits = (digits + '3175550000').slice(0, 10);
  return `+1${paddedDigits}`;
};

const normalizeQueryValue = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseFlagState = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'on' || normalized === 'true' || normalized === '1' || normalized === 'enabled') {
    return true;
  }

  if (normalized === 'off' || normalized === 'false' || normalized === '0' || normalized === 'disabled') {
    return false;
  }

  return null;
};

const parseFlagQueryForTestOverride = (rawFlagsParam: string): ConnectShyftUiFlags => {
  const parsedFlags: ConnectShyftUiFlags = { ...DEFAULT_CONNECTSHYFT_UI_FLAGS };

  rawFlagsParam
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.includes(':'))
    .forEach((segment) => {
      const [rawKey, rawState] = segment.split(':', 2);
      const state = parseFlagState(rawState || '');
      if (state === null) {
        return;
      }

      switch (rawKey.trim().toLowerCase()) {
        case 'module':
          parsedFlags.connectshyft_enabled = state;
          break;
        case 'inbox':
          parsedFlags.connectshyft_inbox_enabled = state;
          break;
        case 'escalation':
          parsedFlags.connectshyft_escalation_enabled = state;
          break;
        case 'webhooks':
          parsedFlags.connectshyft_webhooks_enabled = state;
          break;
        default:
          break;
      }
    });

  return parsedFlags;
};

const parseContextQueryForTestOverride = (): ParsedConnectShyftContextOverride => {
  if (typeof window === 'undefined') {
    return {
      tenantId: null,
      orgUnitId: null,
      role: null,
      userId: null,
      requestedProvider: null,
      orgUnitMemberships: [],
      activeThreadNeighborIds: [],
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const contextMode = normalizeQueryValue(searchParams.get('context'));
  const tenantId = normalizeQueryValue(searchParams.get('tenantId'));
  const role = normalizeQueryValue(searchParams.get('tenantRole'))
    || normalizeQueryValue(searchParams.get('role'));
  const requestedProvider = normalizeQueryValue(searchParams.get('providerKey'))
    || normalizeQueryValue(searchParams.get('requestedProvider'))
    || normalizeQueryValue(searchParams.get('provider'));
  const userId = normalizeQueryValue(searchParams.get('actorUserId'))
    || normalizeQueryValue(searchParams.get('userId'))
    || (role ? `user-connectshyft-ui-${role.toLowerCase()}` : null);
  const rawActiveThreadNeighborIds = normalizeQueryValue(
    searchParams.get('activeThreadNeighborIds'),
  );
  const activeThreadNeighborIds = rawActiveThreadNeighborIds
    ? rawActiveThreadNeighborIds
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    : [];

  const requestedOrgUnitId = normalizeQueryValue(searchParams.get('orgUnitId'));
  const orgUnitId = contextMode === 'missing-orgunit' ? null : requestedOrgUnitId;

  const rawMemberships = normalizeQueryValue(searchParams.get('orgUnitMemberships'));
  if (rawMemberships) {
    const memberships = rawMemberships
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return {
      tenantId,
      orgUnitId,
      role,
      userId,
      requestedProvider,
      orgUnitMemberships: memberships,
      activeThreadNeighborIds,
    };
  }

  return {
    tenantId,
    orgUnitId,
    role,
    userId,
    requestedProvider,
    orgUnitMemberships: orgUnitId ? [orgUnitId] : [],
    activeThreadNeighborIds,
  };
};

export const buildConnectShyftTestOverrideHeaders = (): Record<string, string> => {
  if (!isConnectShyftTestHarnessEnabled() || typeof window === 'undefined') {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);
  const rawFlags = normalizeQueryValue(searchParams.get('flags'));
  const context = parseContextQueryForTestOverride();
  const headers: Record<string, string> = {};

  if (rawFlags) {
    headers['x-test-connectshyft-flags'] = JSON.stringify(parseFlagQueryForTestOverride(rawFlags));
  } else {
    // Keep test-harness behavior deterministic: no query override means fail-closed flags.
    headers['x-test-connectshyft-flags'] = JSON.stringify(DEFAULT_CONNECTSHYFT_UI_FLAGS);
  }

  if (context.tenantId && context.role && context.userId) {
    headers['x-test-connectshyft-tenant-id'] = context.tenantId;
    headers['x-test-connectshyft-role'] = context.role;
    headers['x-test-connectshyft-user-id'] = context.userId;
    if (context.orgUnitId) {
      headers['x-test-connectshyft-orgunit-id'] = context.orgUnitId;
    }
  }

  if (context.orgUnitMemberships.length > 0) {
    headers['x-test-connectshyft-orgunit-memberships'] = JSON.stringify(context.orgUnitMemberships);
  }

  if (context.activeThreadNeighborIds.length > 0) {
    headers['x-test-connectshyft-active-thread-neighbor-ids'] = JSON.stringify(
      context.activeThreadNeighborIds,
    );
  }

  if (context.requestedProvider) {
    headers['x-test-connectshyft-provider-requested'] = context.requestedProvider;
  }

  return headers;
};

export const resolveConnectShyftDeterministicTestPhone = (
  primarySeed?: string | null,
  secondarySeed?: string | null,
): string | null => {
  if (!isConnectShyftTestHarnessEnabled()) {
    return null;
  }

  const primary = normalizeDeterministicPhoneSeed(primarySeed);
  if (primary) {
    return buildDeterministicTestPhone(primary);
  }

  const secondary = normalizeDeterministicPhoneSeed(secondarySeed);
  if (secondary) {
    return buildDeterministicTestPhone(secondary);
  }

  return null;
};

const toBooleanFlag = (value: unknown): boolean => value === true;

const parseServerAvailability = (payload: unknown): ConnectShyftAvailabilityState => {
  const envelope = (payload && typeof payload === 'object')
    ? payload as ConnectShyftAvailabilityEnvelope
    : {};
  const rawFlags = envelope.data?.flags || {};
  const rawEntitlement = envelope.data?.entitlement;
  const rawCapabilities = envelope.data?.capabilities;

  const flags = {
    connectshyft_enabled: toBooleanFlag(rawFlags.connectshyft_enabled),
    connectshyft_inbox_enabled: toBooleanFlag(rawFlags.connectshyft_inbox_enabled),
    connectshyft_escalation_enabled: toBooleanFlag(rawFlags.connectshyft_escalation_enabled),
    connectshyft_webhooks_enabled: toBooleanFlag(rawFlags.connectshyft_webhooks_enabled),
  };

  return {
    flags,
    entitlement: rawEntitlement
      ? {
        moduleKey: typeof rawEntitlement.moduleKey === 'string' ? rawEntitlement.moduleKey : 'connectshyft',
        enabled: rawEntitlement.enabled === true,
        reason: typeof rawEntitlement.reason === 'string' ? rawEntitlement.reason : 'unknown',
      }
      : null,
    capabilities: {
      module: rawCapabilities?.module === true || flags.connectshyft_enabled,
      inbox: rawCapabilities?.inbox === true || flags.connectshyft_inbox_enabled,
      escalation: rawCapabilities?.escalation === true || flags.connectshyft_escalation_enabled,
      webhooks: rawCapabilities?.webhooks === true || flags.connectshyft_webhooks_enabled,
    },
    refusal: envelope.ok === false
      ? {
        code: typeof envelope.code === 'string' ? envelope.code : 'CONNECTSHYFT_UNAVAILABLE',
        message: typeof envelope.message === 'string' ? envelope.message : 'ConnectShyft is unavailable',
        refusalType: envelope.refusalType || 'business',
      }
      : null,
  };
};

export const fetchConnectShyftAvailability = async (): Promise<ConnectShyftAvailabilityState> => {
  try {
    const response = await api.get('/connectshyft/availability', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    return parseServerAvailability(response.data);
  } catch (error: any) {
    if (error?.response?.data) {
      return parseServerAvailability(error.response.data);
    }

    return { ...DEFAULT_CONNECTSHYFT_AVAILABILITY };
  }
};

export const fetchConnectShyftUiFlags = async (): Promise<ConnectShyftUiFlags> => {
  const availability = await fetchConnectShyftAvailability();
  return availability.flags;
};
