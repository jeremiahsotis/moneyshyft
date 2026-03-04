import type { Knex } from 'knex';
import { CAPABILITIES, hasCapability } from '../rbac/capabilities';

type TenantMembershipRecord = {
  roleSetJson: unknown;
} | null;

type OrgUnitMembershipRecord = {
  roleSetJson: unknown;
} | null;

type OrgUnitRecord = {
  id: string;
  tenantId: string;
} | null;

export type OrgUnitAccessFailureReason =
  | 'TENANT_MEMBERSHIP_REQUIRED'
  | 'ORG_UNIT_NOT_FOUND'
  | 'ORG_UNIT_TENANT_MISMATCH'
  | 'ORG_UNIT_MEMBERSHIP_REQUIRED';

export type OrgUnitAccessDecision =
  | {
    ok: true;
    bypassedOrgUnitMembership: boolean;
    effectiveRoles: string[];
  }
  | {
    ok: false;
    reason: OrgUnitAccessFailureReason;
  };

export interface OrgUnitAccessStore {
  findTenantMembership: (tenantId: string, userId: string) => Promise<TenantMembershipRecord>;
  findOrgUnit: (orgUnitId: string) => Promise<OrgUnitRecord>;
  findOrgUnitMembership: (orgUnitId: string, userId: string) => Promise<OrgUnitMembershipRecord>;
}

type ValidateOrgUnitAccessInput = {
  tenantId: string;
  orgUnitId: string;
  userId: string;
  baseRoles?: Array<string | null | undefined>;
};

const parseRoleSetJson = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : [];
    } catch (_error) {
      return [];
    }
  }

  return [];
};

const normalizeRoles = (roles: Array<string | null | undefined>): string[] => {
  const normalized = roles
    .filter((role): role is string => typeof role === 'string')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);

  return Array.from(new Set(normalized));
};

export const isTenantPrivileged = (roles: Array<string | null | undefined>): boolean => {
  return hasCapability(roles, CAPABILITIES.TENANT_READ_ALL);
};

export const createKnexOrgUnitAccessStore = (trx: Knex | Knex.Transaction): OrgUnitAccessStore => {
  return {
    findTenantMembership: async (tenantId, userId) => {
      const row = await trx
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: tenantId, user_id: userId })
        .first(['role_set_json']);

      if (!row) {
        return null;
      }

      return {
        roleSetJson: row.role_set_json,
      };
    },

    findOrgUnit: async (orgUnitId) => {
      const row = await trx
        .withSchema('platform')
        .table('org_units')
        .where({ id: orgUnitId })
        .first(['id', 'tenant_id']);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        tenantId: row.tenant_id,
      };
    },

    findOrgUnitMembership: async (orgUnitId, userId) => {
      const row = await trx
        .withSchema('platform')
        .table('org_unit_memberships')
        .where({ org_unit_id: orgUnitId, user_id: userId })
        .first(['role_set_json']);

      if (!row) {
        return null;
      }

      return {
        roleSetJson: row.role_set_json,
      };
    },
  };
};

export const validateOrgUnitScopedAccess = async (
  store: OrgUnitAccessStore,
  input: ValidateOrgUnitAccessInput
): Promise<OrgUnitAccessDecision> => {
  const tenantMembership = await store.findTenantMembership(input.tenantId, input.userId);
  if (!tenantMembership) {
    return { ok: false, reason: 'TENANT_MEMBERSHIP_REQUIRED' };
  }

  const membershipRoles = parseRoleSetJson(tenantMembership.roleSetJson);
  const effectiveRoles = normalizeRoles([...(input.baseRoles || []), ...membershipRoles]);
  const orgUnit = await store.findOrgUnit(input.orgUnitId);

  if (!orgUnit) {
    return { ok: false, reason: 'ORG_UNIT_NOT_FOUND' };
  }

  if (orgUnit.tenantId !== input.tenantId) {
    return { ok: false, reason: 'ORG_UNIT_TENANT_MISMATCH' };
  }

  const orgUnitMembership = await store.findOrgUnitMembership(input.orgUnitId, input.userId);
  const orgUnitMembershipRoles = orgUnitMembership
    ? parseRoleSetJson(orgUnitMembership.roleSetJson)
    : [];
  const effectiveRolesWithOrgUnitMembership = normalizeRoles([
    ...effectiveRoles,
    ...orgUnitMembershipRoles,
  ]);

  if (isTenantPrivileged(effectiveRoles)) {
    return {
      ok: true,
      bypassedOrgUnitMembership: true,
      effectiveRoles: effectiveRolesWithOrgUnitMembership,
    };
  }

  if (!orgUnitMembership) {
    return { ok: false, reason: 'ORG_UNIT_MEMBERSHIP_REQUIRED' };
  }

  return {
    ok: true,
    bypassedOrgUnitMembership: false,
    effectiveRoles: effectiveRolesWithOrgUnitMembership,
  };
};
