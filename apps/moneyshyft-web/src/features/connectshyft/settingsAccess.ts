import type { LocationQuery } from 'vue-router';

const CONNECTSHYFT_ADMIN_SETTINGS_CAPABILITIES = [
  'tenant:number_mapping:manage',
  'org_unit:escalation:configure',
] as const;

const CONNECTSHYFT_ADMIN_SETTINGS_QUERY_ROLES = new Set([
  'SYSTEM_ADMIN',
  'TENANT_ADMIN',
  'TENANT_STAFF',
]);

const CONNECTSHYFT_LEGACY_ROLE_ALIASES: Record<string, string> = {
  ADMIN: 'TENANT_ADMIN',
  MEMBER: 'ORGUNIT_MEMBER',
};

const isConnectShyftTestHarnessEnabled = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_TEST_CONNECTSHYFT_FLAGS === 'true';
};

export const normalizeConnectShyftQueryValue = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    return normalizeConnectShyftQueryValue(value[0]);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeConnectShyftRole = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return CONNECTSHYFT_LEGACY_ROLE_ALIASES[normalized] || normalized;
};

const parseOrgUnitMemberships = (value: string | null): Set<string> => {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
};

export const resolveConnectShyftAdminAccessFromQuery = (
  query: LocationQuery,
): boolean | null => {
  if (!isConnectShyftTestHarnessEnabled()) {
    return null;
  }

  const role = normalizeConnectShyftRole(
    normalizeConnectShyftQueryValue(query.tenantRole)
      || normalizeConnectShyftQueryValue(query.role),
  );

  if (!role) {
    return null;
  }

  if (role === 'ORGUNIT_ADMIN') {
    const orgUnitMemberships = parseOrgUnitMemberships(
      normalizeConnectShyftQueryValue(query.orgUnitMemberships),
    );
    const orgUnitId = normalizeConnectShyftQueryValue(query.orgUnitId);
    if (orgUnitId) {
      return orgUnitMemberships.has(orgUnitId);
    }

    return orgUnitMemberships.size > 0;
  }

  return CONNECTSHYFT_ADMIN_SETTINGS_QUERY_ROLES.has(role);
};

export const hasConnectShyftAdminSettingsCapability = (input: {
  hasAnyAdminAccess: boolean;
  hasCapability: (capability: string) => boolean;
}): boolean => {
  if (input.hasAnyAdminAccess) {
    return true;
  }

  return CONNECTSHYFT_ADMIN_SETTINGS_CAPABILITIES.some((capability) =>
    input.hasCapability(capability));
};
