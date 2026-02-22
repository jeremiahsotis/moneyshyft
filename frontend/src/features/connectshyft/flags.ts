import api from '@/services/api';

export type ConnectShyftUiFlags = {
  connectshyft_enabled: boolean;
  connectshyft_inbox_enabled: boolean;
  connectshyft_escalation_enabled: boolean;
  connectshyft_webhooks_enabled: boolean;
};

type ConnectShyftAvailabilityEnvelope = {
  data?: {
    flags?: Partial<ConnectShyftUiFlags>;
  };
};

type ParsedConnectShyftContextOverride = {
  tenantId: string | null;
  orgUnitId: string | null;
  role: string | null;
  userId: string | null;
  orgUnitMemberships: string[];
};

export const DEFAULT_CONNECTSHYFT_UI_FLAGS: ConnectShyftUiFlags = {
  connectshyft_enabled: false,
  connectshyft_inbox_enabled: false,
  connectshyft_escalation_enabled: false,
  connectshyft_webhooks_enabled: false,
};

const isConnectShyftTestHarnessEnabled = (): boolean =>
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS === 'true';

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
      orgUnitMemberships: [],
    };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const contextMode = normalizeQueryValue(searchParams.get('context'));
  const tenantId = normalizeQueryValue(searchParams.get('tenantId'));
  const role = normalizeQueryValue(searchParams.get('tenantRole'))
    || normalizeQueryValue(searchParams.get('role'));
  const userId = normalizeQueryValue(searchParams.get('userId'))
    || (role ? `user-connectshyft-ui-${role.toLowerCase()}` : null);

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
      orgUnitMemberships: memberships,
    };
  }

  return {
    tenantId,
    orgUnitId,
    role,
    userId,
    orgUnitMemberships: orgUnitId ? [orgUnitId] : [],
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

  return headers;
};

const toBooleanFlag = (value: unknown): boolean => value === true;

const parseServerFlags = (payload: unknown): ConnectShyftUiFlags => {
  const envelope = (payload && typeof payload === 'object')
    ? payload as ConnectShyftAvailabilityEnvelope
    : {};
  const rawFlags = envelope.data?.flags || {};

  return {
    connectshyft_enabled: toBooleanFlag(rawFlags.connectshyft_enabled),
    connectshyft_inbox_enabled: toBooleanFlag(rawFlags.connectshyft_inbox_enabled),
    connectshyft_escalation_enabled: toBooleanFlag(rawFlags.connectshyft_escalation_enabled),
    connectshyft_webhooks_enabled: toBooleanFlag(rawFlags.connectshyft_webhooks_enabled),
  };
};

export const fetchConnectShyftUiFlags = async (): Promise<ConnectShyftUiFlags> => {
  try {
    const response = await api.get('/connectshyft/availability', {
      headers: buildConnectShyftTestOverrideHeaders(),
    });
    return parseServerFlags(response.data);
  } catch (_error) {
    return { ...DEFAULT_CONNECTSHYFT_UI_FLAGS };
  }
};
