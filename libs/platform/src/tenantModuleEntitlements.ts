import type { Knex } from 'knex';
import { normalizeRole, type ScopedRole } from './rbac/capabilities';

export interface PlatformAdminActorContext {
  userId: string | null;
  baseRole: string | null;
  headerRoles: Array<string | null | undefined>;
  activeTenantId: string | null;
}

type RoleSetInput = Array<string | null | undefined>;

const GOVERNED_MODULE_KEYS = ['connectshyft', 'moneyshyft'] as const;
export type GovernedModuleKey = (typeof GOVERNED_MODULE_KEYS)[number];

export type TenantModuleEntitlementDecision = {
  tenantId: string;
  moduleKey: GovernedModuleKey;
  enabled: boolean;
  reason: 'enabled' | 'disabled' | 'missing' | 'system-admin-override';
  refusalCode: string;
  message: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeRoleSet = (input: RoleSetInput): ScopedRole[] => {
  const resolved: ScopedRole[] = [];
  const seen = new Set<string>();

  input.forEach((rawRole) => {
    const role = normalizeRole(rawRole);
    if (!role) {
      return;
    }

    if (!seen.has(role)) {
      resolved.push(role);
      seen.add(role);
    }
  });

  return resolved;
};

const isUuid = (value: string | null | undefined): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

const hasSystemRole = (actor: PlatformAdminActorContext): boolean => {
  const inlineRoles = normalizeRoleSet([actor.baseRole]);
  return inlineRoles.includes('SYSTEM_ADMIN');
};

const buildEntitlementDecision = (
  tenantId: string,
  moduleKey: GovernedModuleKey,
  enabled: boolean,
  reason: TenantModuleEntitlementDecision['reason']
): TenantModuleEntitlementDecision => {
  const moduleUpper = moduleKey.toUpperCase();

  if (enabled) {
    return {
      tenantId,
      moduleKey,
      enabled: true,
      reason,
      refusalCode: `${moduleUpper}_ENTITLEMENT_ENABLED`,
      message: `${moduleKey} entitlement is enabled for this tenant.`,
    };
  }

  if (reason === 'missing') {
    return {
      tenantId,
      moduleKey,
      enabled: false,
      reason,
      refusalCode: `${moduleUpper}_ENTITLEMENT_MISSING`,
      message: `${moduleKey} entitlement is not configured for this tenant.`,
    };
  }

  return {
    tenantId,
    moduleKey,
    enabled: false,
    reason,
    refusalCode: `${moduleUpper}_MODULE_DISABLED`,
    message: `${moduleKey} is disabled for this tenant.`,
  };
};

export const evaluateTenantModuleEntitlement = async (
  trxClient: Knex,
  tenantId: string,
  moduleKey: GovernedModuleKey
): Promise<TenantModuleEntitlementDecision> => {
  if (!isUuid(tenantId)) {
    return buildEntitlementDecision(tenantId, moduleKey, false, 'missing');
  }

  const entitlement = await trxClient
    .withSchema('platform')
    .table('tenant_module_entitlements')
    .where({ tenant_id: tenantId, module_key: moduleKey })
    .first(['enabled']);

  if (!entitlement) {
    return buildEntitlementDecision(tenantId, moduleKey, false, 'missing');
  }

  if (entitlement.enabled === false) {
    return buildEntitlementDecision(tenantId, moduleKey, false, 'disabled');
  }

  return buildEntitlementDecision(tenantId, moduleKey, true, 'enabled');
};

export const evaluateActorTenantModuleEntitlement = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  tenantId: string,
  moduleKey: GovernedModuleKey
): Promise<TenantModuleEntitlementDecision> => {
  if (hasSystemRole(actor)) {
    return buildEntitlementDecision(tenantId, moduleKey, true, 'system-admin-override');
  }

  return evaluateTenantModuleEntitlement(trxClient, tenantId, moduleKey);
};
