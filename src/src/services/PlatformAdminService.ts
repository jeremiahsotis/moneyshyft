import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { generateInvitationCode } from '../utils/invitationCode';
import { executePlatformMutation } from '../platform/mutations/executePlatformMutation';
import { redactSensitivePayload } from '../platform/audit/redaction';
import {
  CAPABILITIES,
  Capability,
  hasCapability,
  normalizeRole,
  ScopedRole,
} from '../platform/rbac/capabilities';

export interface PlatformAdminActorContext {
  userId: string | null;
  baseRole: string | null;
  headerRoles: Array<string | null | undefined>;
  activeTenantId: string | null;
}

type RoleSetInput = Array<string | null | undefined>;

export interface TenantRecord {
  id: string;
  name: string;
  status: string;
  tenancy_model?: string;
  created_at_utc?: string;
}

export interface BillingAccountRecord {
  id: string;
  name: string;
}

export interface OrgUnitRecord {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  parent_org_unit_id: string | null;
}

export const GOVERNED_MODULE_KEYS = ['connectshyft', 'moneyshyft'] as const;
export type GovernedModuleKey = (typeof GOVERNED_MODULE_KEYS)[number];
export const TENANCY_MODELS = ['single-tenant', 'multi-tenant'] as const;
export type TenancyModel = (typeof TENANCY_MODELS)[number];
export type TenantModuleGrants = Record<GovernedModuleKey, boolean>;
const DEFAULT_TENANCY_MODEL: TenancyModel = 'single-tenant';
const DEFAULT_TENANT_MODULE_GRANTS: TenantModuleGrants = {
  connectshyft: false,
  moneyshyft: true,
};
const BCRYPT_ROUNDS = 12;

export type TenantModuleEntitlementDecision = {
  tenantId: string;
  moduleKey: GovernedModuleKey;
  enabled: boolean;
  reason: 'enabled' | 'disabled' | 'missing' | 'system-admin-override';
  refusalCode: string;
  message: string;
};

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

export const parseRoleSetBody = (value: unknown): ScopedRole[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeRoleSet(value as string[]);
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

const toRoleSetJson = (roles: ScopedRole[]): string => JSON.stringify(roles);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GOVERNANCE_MODULE_BY_CAPABILITY: Partial<Record<Capability, string>> = {
  [CAPABILITIES.ORG_UNIT_CREATE]: 'org_units',
  [CAPABILITIES.ORG_UNIT_UPDATE]: 'org_units',
  [CAPABILITIES.TENANT_MODULE_ASSIGN_BOUNDED]: 'rbac',
  [CAPABILITIES.TENANT_ROLE_ASSIGN]: 'rbac',
  [CAPABILITIES.ORG_UNIT_ADMIN_ASSIGN]: 'rbac',
  [CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE]: 'rbac',
};

const resolveGovernanceModuleKey = (capability: Capability): string | null => {
  return GOVERNANCE_MODULE_BY_CAPABILITY[capability] || null;
};

const isUuid = (value: string | null | undefined): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

const writePlatformEventAndOutbox = async (
  trx: Knex.Transaction,
  event: {
    tenantId: string;
    actorId?: string | null;
    eventName: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> => {
  if (!isUuid(event.tenantId) || !isUuid(event.entityId) || (event.actorId != null && !isUuid(event.actorId))) {
    throw new Error('Mutation contract violation: tenantId, entityId, and actorId (if present) must be UUIDs');
  }

  const sanitizedPayload = redactSensitivePayload(event.payload ?? {}).redactedPayload as Record<string, unknown>;
  const occurredAtUtc = trx.fn.now();
  const [insertedEvent] = await trx
    .withSchema('platform')
    .table('events')
    .insert({
      tenant_id: event.tenantId,
      actor_id: event.actorId ?? null,
      event_name: event.eventName,
      entity_type: event.entityType,
      entity_id: event.entityId,
      occurred_at_utc: occurredAtUtc,
      payload: sanitizedPayload,
    })
    .returning(['id']);

  const eventId = insertedEvent?.id;
  if (typeof eventId !== 'string' || eventId.trim().length === 0) {
    throw new Error('Mutation contract violation: event write did not return an id');
  }

  const [insertedOutboxEvent] = await trx
    .withSchema('platform')
    .table('outbox_events')
    .insert({
      event_id: eventId,
      tenant_id: event.tenantId,
      event_name: event.eventName,
      entity_type: event.entityType,
      entity_id: event.entityId,
      occurred_at_utc: occurredAtUtc,
      payload: sanitizedPayload,
      delivery_status: 'pending',
      delivery_attempts: 0,
      available_at_utc: occurredAtUtc,
    })
    .returning(['id']);

  const outboxId = insertedOutboxEvent?.id;
  if (typeof outboxId !== 'string' || outboxId.trim().length === 0) {
    throw new Error('Mutation contract violation: outbox write did not return an id');
  }
};

const ensureHouseholdShadow = async (trx: Knex.Transaction, tenantId: string, tenantName: string): Promise<void> => {
  const existing = await trx('households').where({ id: tenantId }).first();
  if (existing) {
    return;
  }

  let invitationCode = '';
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = generateInvitationCode();
    const collision = await trx('households').where({ invitation_code: candidate }).first();
    if (!collision) {
      invitationCode = candidate;
      break;
    }
  }

  if (!invitationCode) {
    throw new Error('Unable to generate unique invitation code for tenant shadow household');
  }

  await trx('households').insert({
    id: tenantId,
    name: tenantName,
    invitation_code: invitationCode,
  });
};

const resolveMembershipRoles = async (
  trx: Knex.Transaction,
  userId: string,
  tenantId?: string,
  orgUnitId?: string
): Promise<string[]> => {
  const roles: string[] = [];

  if (tenantId) {
    const tenantMembership = await trx
      .withSchema('platform')
      .table('tenant_memberships')
      .where({ tenant_id: tenantId, user_id: userId })
      .first();

    roles.push(...parseRoleSetJson(tenantMembership?.role_set_json));
  }

  if (orgUnitId) {
    const orgUnitMembership = await trx
      .withSchema('platform')
      .table('org_unit_memberships')
      .where({ org_unit_id: orgUnitId, user_id: userId })
      .first();

    roles.push(...parseRoleSetJson(orgUnitMembership?.role_set_json));
  }

  return roles;
};

const resolveRequestRoles = async (
  trx: Knex.Transaction,
  actor: PlatformAdminActorContext,
  tenantId?: string,
  orgUnitId?: string
): Promise<ScopedRole[]> => {
  const baseRole = actor.baseRole || null;

  const legacyRoleAliases: Record<string, ScopedRole> = {
    admin: 'TENANT_ADMIN',
    member: 'ORGUNIT_MEMBER',
  };

  const normalizedLegacy = baseRole && legacyRoleAliases[baseRole.toLowerCase()]
    ? legacyRoleAliases[baseRole.toLowerCase()]
    : null;

  const membershipRoles = actor.userId
    ? await resolveMembershipRoles(trx, actor.userId, tenantId, orgUnitId)
    : [];

  return normalizeRoleSet([
    baseRole,
    normalizedLegacy,
    ...actor.headerRoles,
    ...membershipRoles,
  ]);
};

const requireCapability = async (
  trx: Knex.Transaction,
  actor: PlatformAdminActorContext,
  capability: Capability,
  tenantId?: string,
  orgUnitId?: string
): Promise<ScopedRole[]> => {
  if (tenantId) {
    await ensureScopedTenantExists(trx, tenantId);
  }

  const roles = await resolveRequestRoles(trx, actor, tenantId, orgUnitId);

  if (!hasCapability(roles, capability)) {
    throw new Error(`FORBIDDEN:${capability}`);
  }

  const moduleKey = resolveGovernanceModuleKey(capability);
  if (moduleKey && tenantId) {
    const entitlement = await trx
      .withSchema('platform')
      .table('tenant_module_entitlements')
      .where({ tenant_id: tenantId, module_key: moduleKey })
      .first(['enabled']);

    if (entitlement && entitlement.enabled === false) {
      throw new Error(`MODULE_DISABLED:${moduleKey}`);
    }
  }

  return roles;
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

const normalizeIdInput = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEmailInput = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return null;
  }

  return normalized;
};

const normalizeTenancyModel = (value: unknown): TenancyModel => {
  if (typeof value !== 'string') {
    return DEFAULT_TENANCY_MODEL;
  }

  const normalized = value.trim().toLowerCase();
  if ((TENANCY_MODELS as readonly string[]).includes(normalized)) {
    return normalized as TenancyModel;
  }

  return DEFAULT_TENANCY_MODEL;
};

const normalizeTenantModuleGrants = (value: unknown): TenantModuleGrants => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_TENANT_MODULE_GRANTS };
  }

  const record = value as Partial<Record<GovernedModuleKey, unknown>>;
  return {
    connectshyft: typeof record.connectshyft === 'boolean'
      ? record.connectshyft
      : DEFAULT_TENANT_MODULE_GRANTS.connectshyft,
    moneyshyft: typeof record.moneyshyft === 'boolean'
      ? record.moneyshyft
      : DEFAULT_TENANT_MODULE_GRANTS.moneyshyft,
  };
};

const normalizeNamePart = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const deriveNameFromEmail = (email: string): { firstName: string; lastName: string } => {
  const local = email.split('@')[0]?.trim() || 'user';
  const tokens = local.split(/[.\-_+]/g).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { firstName: 'Admin', lastName: 'User' };
  }

  const titleCase = (token: string) => token.slice(0, 1).toUpperCase() + token.slice(1).toLowerCase();
  const firstName = titleCase(tokens[0]);
  const lastName = titleCase(tokens.slice(1).join(' ') || 'User');
  return { firstName, lastName };
};

const isUsersEmailUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeDbError = error as { code?: string; constraint?: string };
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'users_email_unique';
};

const isPgLockConflictError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeDbError = error as { code?: string };
  return maybeDbError.code === '55P03';
};

type ScopedUserRecord = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  household_id: string | null;
};

const findUserById = async (
  trx: Knex.Transaction,
  userId: string
): Promise<ScopedUserRecord | null> => trx('users')
  .where({ id: userId })
  .first(['id', 'email', 'first_name', 'last_name', 'household_id']);

const findUserByEmail = async (
  trx: Knex.Transaction,
  email: string
): Promise<ScopedUserRecord | null> => trx('users')
  .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
  .first(['id', 'email', 'first_name', 'last_name', 'household_id']);

const isUserInTenantScope = async (
  trx: Knex.Transaction,
  tenantId: string,
  userId: string
): Promise<boolean> => {
  const tenantMembership = await trx
    .withSchema('platform')
    .table('tenant_memberships')
    .where({ tenant_id: tenantId, user_id: userId })
    .first(['user_id']);

  if (tenantMembership) {
    return true;
  }

  const orgUnitMembership = await trx
    .withSchema('platform')
    .table('org_unit_memberships as oum')
    .join('org_units as ou', 'oum.org_unit_id', 'ou.id')
    .where('ou.tenant_id', tenantId)
    .andWhere('oum.user_id', userId)
    .first(['oum.user_id']);

  if (orgUnitMembership) {
    return true;
  }

  const householdBoundUser = await trx('users')
    .where({ id: userId, household_id: tenantId })
    .first(['id']);

  return !!householdBoundUser;
};

type ResolveScopedUserInput = {
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  temporaryPassword?: string;
  forceResetOnFirstLogin?: boolean;
  allowInlineCreate?: boolean;
  strictScope?: boolean;
  reason: string;
};

type ResolveScopedUserResult = {
  userId: string;
  email: string;
  createdInline: boolean;
};

const resolveScopedUserForAssignment = async (
  trx: Knex.Transaction,
  actor: PlatformAdminActorContext,
  tenantId: string,
  input: ResolveScopedUserInput
): Promise<ResolveScopedUserResult> => {
  const normalizedUserId = normalizeIdInput(input.userId || null);
  const normalizedEmail = normalizeEmailInput(input.userEmail || null);
  const strictScope = input.strictScope !== false;
  const allowInlineCreate = input.allowInlineCreate === true || !!normalizedEmail;

  if (!normalizedUserId && !normalizedEmail) {
    throw new Error('USER_REFERENCE_REQUIRED');
  }

  let resolvedUser: ScopedUserRecord | null = null;
  let createdInline = false;

  if (normalizedUserId) {
    resolvedUser = await findUserById(trx, normalizedUserId);
    if (!resolvedUser) {
      throw new Error('USER_NOT_FOUND');
    }
  } else if (normalizedEmail) {
    resolvedUser = await findUserByEmail(trx, normalizedEmail);
    if (!resolvedUser && allowInlineCreate) {
      const fallbackNames = deriveNameFromEmail(normalizedEmail);
      const firstName = normalizeNamePart(input.firstName, fallbackNames.firstName);
      const lastName = normalizeNamePart(input.lastName, fallbackNames.lastName);
      const normalizedTemporaryPassword = typeof input.temporaryPassword === 'string'
        ? input.temporaryPassword.trim()
        : '';
      const resolvedTemporaryPassword = normalizedTemporaryPassword.length > 0
        ? normalizedTemporaryPassword
        : randomUUID();
      const shouldForceResetOnFirstLogin = input.forceResetOnFirstLogin !== false;
      const passwordHash = await bcrypt.hash(resolvedTemporaryPassword, BCRYPT_ROUNDS);

      try {
        const [insertedUser] = await trx('users')
          .insert({
            email: normalizedEmail,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            household_id: tenantId,
            role: 'member',
            must_reset_password: shouldForceResetOnFirstLogin,
            password_set_by_admin: true,
          })
          .returning(['id', 'email', 'first_name', 'last_name', 'household_id']);

        if (!insertedUser) {
          throw new Error('INLINE_USER_CREATE_FAILED');
        }

        resolvedUser = insertedUser as ScopedUserRecord;
        createdInline = true;
      } catch (error) {
        if (!isUsersEmailUniqueConstraintError(error)) {
          throw error;
        }

        resolvedUser = await findUserByEmail(trx, normalizedEmail);
      }
    }

    if (!resolvedUser) {
      throw new Error('USER_NOT_FOUND');
    }
  }

  if (!resolvedUser) {
    throw new Error('USER_NOT_FOUND');
  }

  if (strictScope && !createdInline && !hasSystemRole(actor)) {
    const inScope = await isUserInTenantScope(trx, tenantId, resolvedUser.id);
    if (!inScope) {
      throw new Error('USER_OUT_OF_SCOPE');
    }
  }

  if (createdInline) {
    await writePlatformEventAndOutbox(trx, {
      tenantId,
      actorId: actor.userId,
      eventName: 'platform.user.inline_created',
      entityType: 'user',
      entityId: resolvedUser.id,
      payload: {
        actorId: actor.userId,
        tenantId,
        scope: {
          layer: 'TENANT',
          tenantId,
          orgUnitId: null,
        },
        reason: input.reason.trim(),
        userEmail: resolvedUser.email,
      },
    });
  }

  return {
    userId: resolvedUser.id,
    email: resolvedUser.email,
    createdInline,
  };
};

const ensureOrgUnitExists = async (
  trx: Knex.Transaction,
  tenantId: string,
  orgUnitId: string
): Promise<{ id: string; parent_org_unit_id: string | null }> => {
  try {
    const orgUnit = await trx
      .withSchema('platform')
      .table('org_units')
      .where({ id: orgUnitId, tenant_id: tenantId })
      .forUpdate()
      .noWait()
      .first(['id', 'parent_org_unit_id']);

    if (!orgUnit) {
      throw new Error('ORG_UNIT_NOT_FOUND');
    }

    return orgUnit;
  } catch (error) {
    if (isPgLockConflictError(error)) {
      throw new Error('ORG_UNIT_REPARENT_CONFLICT');
    }

    throw error;
  }
};

const ensureParentChainIsCycleSafe = async (
  trx: Knex.Transaction,
  tenantId: string,
  orgUnitId: string,
  nextParentOrgUnitId: string | null
): Promise<void> => {
  if (!nextParentOrgUnitId) {
    return;
  }

  if (nextParentOrgUnitId === orgUnitId) {
    throw new Error('ORG_UNIT_CYCLE_DETECTED');
  }

  const visited = new Set<string>();
  let cursor: string | null = nextParentOrgUnitId;

  while (cursor) {
    if (visited.has(cursor)) {
      throw new Error('ORG_UNIT_CYCLE_DETECTED');
    }
    visited.add(cursor);

    const row = await ensureOrgUnitExists(trx, tenantId, cursor);
    if (row.id === orgUnitId) {
      throw new Error('ORG_UNIT_CYCLE_DETECTED');
    }

    cursor = row.parent_org_unit_id;
  }
};

const ensureTenantModuleGrants = async (
  trx: Knex.Transaction,
  tenantId: string,
  actorId: string | null,
  reason: string,
  moduleGrants: TenantModuleGrants
): Promise<void> => {
  for (const moduleKey of GOVERNED_MODULE_KEYS) {
    await trx
      .withSchema('platform')
      .table('tenant_module_entitlements')
      .insert({
        tenant_id: tenantId,
        module_key: moduleKey,
        enabled: moduleGrants[moduleKey],
        reason,
        created_by_user_id: actorId,
        updated_by_user_id: actorId,
      })
      .onConflict(['tenant_id', 'module_key'])
      .merge({
        enabled: moduleGrants[moduleKey],
        reason,
        updated_by_user_id: actorId,
        updated_at_utc: trx.fn.now(),
      });
  }
};

const ensureScopedTenantExists = async (
  trx: Knex.Transaction,
  tenantId: string
): Promise<void> => {
  const existingTenant = await trx
    .withSchema('platform')
    .table('tenants')
    .where({ id: tenantId })
    .first(['id']);

  if (existingTenant) {
    return;
  }

  const household = await trx('households')
    .where({ id: tenantId })
    .first(['id', 'name']);

  if (!household) {
    throw new Error('TENANT_NOT_FOUND');
  }

  const tenantName = typeof household.name === 'string' && household.name.trim().length > 0
    ? household.name.trim()
    : `Tenant ${tenantId.slice(0, 8)}`;

  await trx
    .withSchema('platform')
    .table('tenants')
    .insert({
      id: tenantId,
      name: tenantName,
      status: 'active',
      created_at_utc: trx.fn.now(),
      updated_at_utc: trx.fn.now(),
    })
    .onConflict('id')
    .ignore();
};

export const resolveScopedTenantId = (
  actor: PlatformAdminActorContext,
  requestedTenantId?: string | null
): string => {
  const activeTenantId = normalizeIdInput(actor.activeTenantId);
  const requested = normalizeIdInput(requestedTenantId || null);

  if (hasSystemRole(actor)) {
    const resolved = requested || activeTenantId;
    if (!resolved) {
      throw new Error('TENANT_ID_REQUIRED');
    }

    return resolved;
  }

  if (!activeTenantId) {
    throw new Error('TENANT_SCOPE_REQUIRED');
  }

  if (requested && requested !== activeTenantId) {
    throw new Error('TENANT_SCOPE_MISMATCH');
  }

  return activeTenantId;
};

const shouldGateInitialTenantAdminAssignment = (roles: ScopedRole[]): boolean => roles.includes('TENANT_ADMIN');

const hasExistingTenantAdmin = async (trx: Knex.Transaction, tenantId: string): Promise<boolean> => {
  const existing = await trx
    .withSchema('platform')
    .table('tenant_memberships')
    .where({ tenant_id: tenantId })
    .whereRaw('role_set_json @> ?::jsonb', [JSON.stringify(['TENANT_ADMIN'])])
    .first(['user_id']);

  return !!existing;
};

const ensureInitialTenantAdminAssignmentAllowed = async (
  trx: Knex.Transaction,
  actor: PlatformAdminActorContext,
  tenantId: string,
  nextRoleSet: ScopedRole[]
): Promise<void> => {
  if (!shouldGateInitialTenantAdminAssignment(nextRoleSet)) {
    return;
  }

  const initialAdminExists = await hasExistingTenantAdmin(trx, tenantId);
  if (initialAdminExists) {
    return;
  }

  await requireCapability(trx, actor, CAPABILITIES.TENANT_ADMIN_ASSIGN, tenantId);
};

export interface ScopedUserLookupInput {
  tenantId?: string;
  orgUnitId?: string;
  q: string;
  page?: number;
  pageSize?: number;
}

export type ScopedLookupUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ScopedUserLookupResult {
  tenantId: string;
  orgUnitId: string | null;
  q: string;
  page: number;
  pageSize: number;
  total: number;
  users: ScopedLookupUser[];
}

const normalizePage = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
};

const normalizePageSize = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 20;
  }

  return Math.max(1, Math.min(25, Math.floor(value)));
};

export const lookupScopedUsers = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: ScopedUserLookupInput
): Promise<ScopedUserLookupResult> => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const orgUnitId = normalizeIdInput(input.orgUnitId || null);
  const query = (input.q || '').trim().toLowerCase();
  const page = normalizePage(input.page);
  const pageSize = normalizePageSize(input.pageSize);
  const offset = (page - 1) * pageSize;

  if (query.length < 3) {
    throw new Error('USER_LOOKUP_QUERY_TOO_SHORT');
  }

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.TENANT_READ_ALL, tenantId, orgUnitId || undefined);

      if (orgUnitId) {
        const orgUnit = await trx
          .withSchema('platform')
          .table('org_units')
          .where({ id: orgUnitId, tenant_id: tenantId })
          .first(['id']);

        if (!orgUnit) {
          throw new Error('ORG_UNIT_NOT_FOUND');
        }
      }

      const buildLookupQuery = () => {
        const scoped = trx('users')
          .where((scopeBuilder) => {
            scopeBuilder.whereExists(
              trx
                .withSchema('platform')
                .table('tenant_memberships as tm')
                .select(trx.raw('1'))
                .whereRaw('tm.user_id = users.id')
                .andWhere('tm.tenant_id', tenantId)
            ).orWhereExists(
              trx
                .withSchema('platform')
                .table('org_unit_memberships as oum')
                .join('org_units as ou', 'oum.org_unit_id', 'ou.id')
                .select(trx.raw('1'))
                .whereRaw('oum.user_id = users.id')
                .andWhere('ou.tenant_id', tenantId)
            );
          })
          .andWhere((searchBuilder) => {
            searchBuilder
              .whereRaw('LOWER(users.email) LIKE ?', [`%${query}%`])
              .orWhereRaw(
                "LOWER(COALESCE(users.first_name, '') || ' ' || COALESCE(users.last_name, '')) LIKE ?",
                [`%${query}%`]
              );
          });

        if (orgUnitId) {
          scoped.whereExists(
            trx
              .withSchema('platform')
              .table('org_unit_memberships as scoped_oum')
              .select(trx.raw('1'))
              .whereRaw('scoped_oum.user_id = users.id')
              .andWhere('scoped_oum.org_unit_id', orgUnitId)
          );
        }

        return scoped;
      };

      const totalRow = await buildLookupQuery()
        .clone()
        .count<{ count: string }>('* as count')
        .first();

      const users = await buildLookupQuery()
        .clone()
        .select('users.id', 'users.email', 'users.first_name', 'users.last_name')
        .orderByRaw('LOWER(users.email) ASC')
        .orderBy('users.id', 'asc')
        .limit(pageSize)
        .offset(offset);

      const resolvedUsers: ScopedLookupUser[] = users.map((user) => ({
        id: String(user.id),
        email: String(user.email),
        firstName: String(user.first_name || ''),
        lastName: String(user.last_name || ''),
      }));

      return {
        tenantId,
        orgUnitId: orgUnitId || null,
        q: query,
        page,
        pageSize,
        total: Number(totalRow?.count || 0),
        users: resolvedUsers,
      };
    },
    event: (result) => ({
      tenantId: result.tenantId,
      actorId: actor.userId,
      eventName: 'platform.identity.lookup.executed',
      entityType: 'tenant',
      entityId: result.tenantId,
      payload: {
        actorId: actor.userId,
        tenantId: result.tenantId,
        scope: {
          layer: result.orgUnitId ? 'ORG_UNIT' : 'TENANT',
          tenantId: result.tenantId,
          orgUnitId: result.orgUnitId,
        },
        queryLength: result.q.length,
        page: result.page,
        pageSize: result.pageSize,
        resultCount: result.users.length,
      },
    }),
  }, trxClient);
};

export interface EnsureScopedAdminUserInput {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  temporaryPassword?: string;
  forceResetOnFirstLogin?: boolean;
  reason: string;
}

export const ensureScopedAdminUser = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: EnsureScopedAdminUserInput
): Promise<ResolveScopedUserResult & { tenantId: string }> => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.TENANT_READ_ALL, tenantId);
      const result = await resolveScopedUserForAssignment(trx, actor, tenantId, {
        userId: input.userId,
        userEmail: input.userEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        temporaryPassword: input.temporaryPassword,
        forceResetOnFirstLogin: input.forceResetOnFirstLogin,
        allowInlineCreate: true,
        strictScope: true,
        reason: input.reason,
      });

      return {
        tenantId,
        ...result,
      };
    },
    event: (result) => ({
      tenantId: result.tenantId,
      actorId: actor.userId,
      eventName: 'platform.user.ensure_scoped.completed',
      entityType: 'user',
      entityId: result.userId,
      payload: {
        actorId: actor.userId,
        tenantId: result.tenantId,
        scope: {
          layer: 'TENANT',
          tenantId: result.tenantId,
          orgUnitId: null,
        },
        reason: input.reason.trim(),
        createdInlineUser: result.createdInline,
      },
    }),
  }, trxClient);
};

export interface CreateTenantInput {
  name: string;
  status?: string;
  billingAccountName?: string;
  assignTenantAdminUserId?: string;
  assignTenantAdminUserEmail?: string;
  assignTenantAdminFirstName?: string;
  assignTenantAdminLastName?: string;
  assignTenantAdminTemporaryPassword?: string;
  assignTenantAdminForceResetOnFirstLogin?: boolean;
  tenancyModel?: TenancyModel;
  moduleGrants?: Partial<TenantModuleGrants>;
  reason?: string;
}

export const createTenant = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: CreateTenantInput
) => {
  const actorId = actor.userId;
  const status = input.status || 'active';
  const reason = normalizeIdInput(input.reason || null) || 'tenant-create';
  const tenancyModel = normalizeTenancyModel(input.tenancyModel);
  const moduleGrants = normalizeTenantModuleGrants(input.moduleGrants);

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.TENANT_CREATE);

      const [tenant] = await trx
        .withSchema('platform')
        .table('tenants')
        .insert({
          name: input.name.trim(),
          status,
          tenancy_model: tenancyModel,
        })
        .returning(['id', 'name', 'status', 'tenancy_model', 'created_at_utc']);

      await ensureHouseholdShadow(trx, tenant.id, tenant.name);
      await ensureTenantModuleGrants(trx, tenant.id, actorId, reason, moduleGrants);

      let billingAccount: BillingAccountRecord | null = null;
      if (typeof input.billingAccountName === 'string' && input.billingAccountName.trim() !== '') {
        const [createdBilling] = await trx
          .withSchema('platform')
          .table('billing_accounts')
          .insert({
            name: input.billingAccountName.trim(),
            status: 'active',
          })
          .returning(['id', 'name']);

        await trx
          .withSchema('platform')
          .table('tenant_billing')
          .insert({
            tenant_id: tenant.id,
            billing_account_id: createdBilling.id,
          });

        billingAccount = createdBilling;
      }

      let assignUserId: string | null = normalizeIdInput(input.assignTenantAdminUserId || null);
      let createdInlineAdmin = false;
      const assignUserEmail = normalizeEmailInput(input.assignTenantAdminUserEmail || null);
      if (!assignUserId && assignUserEmail) {
        const resolvedInlineAdmin = await resolveScopedUserForAssignment(trx, actor, tenant.id, {
          userEmail: assignUserEmail,
          firstName: input.assignTenantAdminFirstName,
          lastName: input.assignTenantAdminLastName,
          temporaryPassword: input.assignTenantAdminTemporaryPassword,
          forceResetOnFirstLogin: input.assignTenantAdminForceResetOnFirstLogin,
          allowInlineCreate: true,
          strictScope: false,
          reason,
        });

        assignUserId = resolvedInlineAdmin.userId;
        createdInlineAdmin = resolvedInlineAdmin.createdInline;
      }

      if (assignUserId) {
        await requireCapability(trx, actor, CAPABILITIES.TENANT_ADMIN_ASSIGN, tenant.id);

        await trx
          .withSchema('platform')
          .table('tenant_memberships')
          .insert({
            tenant_id: tenant.id,
            user_id: assignUserId,
            role_set_json: toRoleSetJson(['TENANT_ADMIN']),
          })
          .onConflict(['tenant_id', 'user_id'])
          .merge({
            role_set_json: toRoleSetJson(['TENANT_ADMIN']),
            updated_at_utc: trx.fn.now(),
          });

        await writePlatformEventAndOutbox(trx, {
          tenantId: tenant.id,
          actorId,
          eventName: 'platform.tenant_membership.upserted',
          entityType: 'tenant_membership',
          entityId: assignUserId,
          payload: {
            actorId,
            tenantId: tenant.id,
            scope: {
              layer: 'TENANT',
              tenantId: tenant.id,
              orgUnitId: null,
            },
            reason,
            roleSet: ['TENANT_ADMIN'],
            createdInlineAdmin,
          },
        });
      }

      return {
        tenant: tenant as TenantRecord,
        billingAccount,
        tenancyModel,
        moduleGrants,
      };
    },
    event: (result) => ({
      tenantId: result.tenant.id,
      actorId,
      eventName: 'platform.tenant.created',
      entityType: 'tenant',
      entityId: result.tenant.id,
      payload: {
        actorId,
        tenantId: result.tenant.id,
        scope: {
          layer: 'TENANT',
          tenantId: result.tenant.id,
          orgUnitId: null,
        },
        reason,
        status: result.tenant.status,
        tenancyModel: result.tenancyModel,
        moduleGrants: result.moduleGrants,
        hasBillingAccount: !!result.billingAccount,
      },
    }),
  }, trxClient);
};

export interface UpsertTenantModuleEntitlementInput {
  tenantId?: string;
  moduleKey: string;
  enabled: boolean;
  reason: string;
}

export const upsertTenantModuleEntitlement = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: UpsertTenantModuleEntitlementInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;
  const moduleKey = input.moduleKey.trim().toLowerCase();
  const reason = input.reason.trim();

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.MODULE_ENTITLEMENT_MANAGE, tenantId);

      if (!hasSystemRole(actor)) {
        await requireCapability(trx, actor, CAPABILITIES.TENANT_MODULE_ASSIGN_BOUNDED, tenantId);

        if (input.enabled) {
          const baselineEntitlement = await trx
            .withSchema('platform')
            .table('tenant_module_entitlements')
            .where({ tenant_id: tenantId, module_key: moduleKey })
            .first(['enabled']);

          if (!baselineEntitlement || baselineEntitlement.enabled !== true) {
            throw new Error('FORBIDDEN_MODULE_ASSIGNMENT_BOUNDARY');
          }
        }
      }

      const [entitlement] = await trx
        .withSchema('platform')
        .table('tenant_module_entitlements')
        .insert({
          tenant_id: tenantId,
          module_key: moduleKey,
          enabled: input.enabled,
          reason,
          created_by_user_id: actorId,
          updated_by_user_id: actorId,
        })
        .onConflict(['tenant_id', 'module_key'])
        .merge({
          enabled: input.enabled,
          reason,
          updated_by_user_id: actorId,
          updated_at_utc: trx.fn.now(),
        })
        .returning(['id', 'tenant_id', 'module_key', 'enabled', 'reason', 'updated_at_utc']);

      return { entitlement };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.tenant_module_entitlement.upserted',
      entityType: 'tenant_module_entitlement',
      entityId: result.entitlement.id,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'TENANT',
          tenantId,
          orgUnitId: null,
        },
        reason,
        moduleKey: result.entitlement.module_key,
        enabled: result.entitlement.enabled,
      },
    }),
  }, trxClient);
};

export interface CreateOrgUnitInput {
  tenantId?: string;
  name: string;
  type?: string;
  parentOrgUnitId?: string | null;
  status?: string;
  reason?: string;
}

export const createOrgUnit = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: CreateOrgUnitInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;
  const reason = normalizeIdInput(input.reason || null) || 'org-unit-create';

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.ORG_UNIT_CREATE, tenantId);
      const parentOrgUnitId = normalizeIdInput(input.parentOrgUnitId || null);

      if (parentOrgUnitId) {
        await ensureOrgUnitExists(trx, tenantId, parentOrgUnitId);
      }

      const [orgUnit] = await trx
        .withSchema('platform')
        .table('org_units')
        .insert({
          tenant_id: tenantId,
          parent_org_unit_id: parentOrgUnitId,
          type: (input.type || 'ORG_UNIT').trim(),
          name: input.name.trim(),
          status: (input.status || 'active').trim(),
        })
        .returning(['id', 'tenant_id', 'name', 'type', 'status', 'parent_org_unit_id']);

      return { orgUnit: orgUnit as OrgUnitRecord };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.org_unit.created',
      entityType: 'org_unit',
      entityId: result.orgUnit.id,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'ORG_UNIT',
          tenantId,
          orgUnitId: result.orgUnit.id,
        },
        reason,
        type: result.orgUnit.type,
        parentOrgUnitId: result.orgUnit.parent_org_unit_id,
      },
    }),
  }, trxClient);
};

export interface UpdateOrgUnitInput {
  tenantId?: string;
  orgUnitId: string;
  name?: string;
  type?: string;
  parentOrgUnitId?: string | null;
  status?: string;
  reason?: string;
}

export const updateOrgUnit = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: UpdateOrgUnitInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;
  const reason = normalizeIdInput(input.reason || null) || 'org-unit-update';

  return executePlatformMutation({
    mutation: async (trx) => {
      const orgUnit = await ensureOrgUnitExists(trx, tenantId, input.orgUnitId.trim());

      await requireCapability(trx, actor, CAPABILITIES.ORG_UNIT_UPDATE, tenantId, orgUnit.id);

      const patch: Record<string, unknown> = {
        updated_at_utc: trx.fn.now(),
      };

      if (typeof input.name === 'string' && input.name.trim() !== '') {
        patch.name = input.name.trim();
      }

      if (typeof input.type === 'string' && input.type.trim() !== '') {
        patch.type = input.type.trim();
      }

      if (typeof input.status === 'string' && input.status.trim() !== '') {
        patch.status = input.status.trim();
      }

      if (input.parentOrgUnitId !== undefined) {
        const nextParentOrgUnitId = normalizeIdInput(input.parentOrgUnitId || null);
        await ensureParentChainIsCycleSafe(trx, tenantId, orgUnit.id, nextParentOrgUnitId);
        patch.parent_org_unit_id = nextParentOrgUnitId;
      }

      const [updatedOrgUnit] = await trx
        .withSchema('platform')
        .table('org_units')
        .where({ id: orgUnit.id, tenant_id: tenantId })
        .update(patch)
        .returning(['id', 'tenant_id', 'name', 'type', 'status', 'parent_org_unit_id']);

      return { orgUnit: updatedOrgUnit as OrgUnitRecord };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.org_unit.updated',
      entityType: 'org_unit',
      entityId: result.orgUnit.id,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'ORG_UNIT',
          tenantId,
          orgUnitId: result.orgUnit.id,
        },
        reason,
        type: result.orgUnit.type,
        parentOrgUnitId: result.orgUnit.parent_org_unit_id,
        status: result.orgUnit.status,
      },
    }),
  }, trxClient);
};

export interface UpsertTenantMembershipInput {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  roleSet: ScopedRole[];
  reason: string;
}

export const upsertTenantMembership = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: UpsertTenantMembershipInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.TENANT_ROLE_ASSIGN, tenantId);
      await ensureInitialTenantAdminAssignmentAllowed(trx, actor, tenantId, input.roleSet);
      const resolvedUser = await resolveScopedUserForAssignment(trx, actor, tenantId, {
        userId: input.userId,
        userEmail: input.userEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        allowInlineCreate: true,
        strictScope: true,
        reason: input.reason,
      });

      await trx
        .withSchema('platform')
        .table('tenant_memberships')
        .insert({
          tenant_id: tenantId,
          user_id: resolvedUser.userId,
          role_set_json: toRoleSetJson(input.roleSet),
        })
        .onConflict(['tenant_id', 'user_id'])
        .merge({
          role_set_json: toRoleSetJson(input.roleSet),
          updated_at_utc: trx.fn.now(),
        });

      return {
        tenantId,
        userId: resolvedUser.userId,
        userEmail: resolvedUser.email,
        createdInlineUser: resolvedUser.createdInline,
        roleSet: input.roleSet,
      };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.tenant_membership.upserted',
      entityType: 'tenant_membership',
      entityId: result.userId,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'TENANT',
          tenantId,
          orgUnitId: null,
        },
        reason: input.reason.trim(),
        userEmail: result.userEmail,
        createdInlineUser: result.createdInlineUser,
        roleSet: result.roleSet,
      },
    }),
  }, trxClient);
};

export interface RevokeTenantMembershipInput {
  tenantId?: string;
  userId: string;
  reason: string;
}

export const revokeTenantMembership = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: RevokeTenantMembershipInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;

  return executePlatformMutation({
    mutation: async (trx) => {
      await requireCapability(trx, actor, CAPABILITIES.TENANT_ROLE_ASSIGN, tenantId);

      const deleted = await trx
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: tenantId, user_id: input.userId.trim() })
        .del();

      if (!deleted) {
        throw new Error('TENANT_MEMBERSHIP_NOT_FOUND');
      }

      return {
        tenantId,
        userId: input.userId.trim(),
      };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.tenant_membership.revoked',
      entityType: 'tenant_membership',
      entityId: result.userId,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'TENANT',
          tenantId,
          orgUnitId: null,
        },
        reason: input.reason.trim(),
      },
    }),
  }, trxClient);
};

export interface UpsertOrgUnitMembershipInput {
  tenantId?: string;
  orgUnitId: string;
  userId?: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
  roleSet: ScopedRole[];
  reason: string;
}

export const upsertOrgUnitMembership = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: UpsertOrgUnitMembershipInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;

  return executePlatformMutation({
    mutation: async (trx) => {
      const orgUnit = await ensureOrgUnitExists(trx, tenantId, input.orgUnitId.trim());

      await requireCapability(trx, actor, CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE, tenantId, orgUnit.id);
      const resolvedUser = await resolveScopedUserForAssignment(trx, actor, tenantId, {
        userId: input.userId,
        userEmail: input.userEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        allowInlineCreate: true,
        strictScope: true,
        reason: input.reason,
      });

      await trx
        .withSchema('platform')
        .table('org_unit_memberships')
        .insert({
          org_unit_id: orgUnit.id,
          user_id: resolvedUser.userId,
          role_set_json: toRoleSetJson(input.roleSet),
        })
        .onConflict(['org_unit_id', 'user_id'])
        .merge({
          role_set_json: toRoleSetJson(input.roleSet),
          updated_at_utc: trx.fn.now(),
        });

      return {
        orgUnitId: orgUnit.id,
        tenantId,
        userId: resolvedUser.userId,
        userEmail: resolvedUser.email,
        createdInlineUser: resolvedUser.createdInline,
        roleSet: input.roleSet,
      };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.org_unit_membership.upserted',
      entityType: 'org_unit_membership',
      entityId: result.userId,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'ORG_UNIT',
          tenantId,
          orgUnitId: result.orgUnitId,
        },
        reason: input.reason.trim(),
        userEmail: result.userEmail,
        createdInlineUser: result.createdInlineUser,
        roleSet: result.roleSet,
      },
    }),
  }, trxClient);
};

export interface RevokeOrgUnitMembershipInput {
  tenantId?: string;
  orgUnitId: string;
  userId: string;
  reason: string;
}

export const revokeOrgUnitMembership = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  input: RevokeOrgUnitMembershipInput
) => {
  const tenantId = resolveScopedTenantId(actor, input.tenantId);
  const actorId = actor.userId;

  return executePlatformMutation({
    mutation: async (trx) => {
      const orgUnit = await trx
        .withSchema('platform')
        .table('org_units')
        .where({ id: input.orgUnitId.trim(), tenant_id: tenantId })
        .first(['id']);

      if (!orgUnit) {
        throw new Error('ORG_UNIT_NOT_FOUND');
      }

      await requireCapability(trx, actor, CAPABILITIES.ORG_UNIT_MEMBERSHIP_MANAGE, tenantId, orgUnit.id);

      const deleted = await trx
        .withSchema('platform')
        .table('org_unit_memberships')
        .where({ org_unit_id: orgUnit.id, user_id: input.userId.trim() })
        .del();

      if (!deleted) {
        throw new Error('ORG_UNIT_MEMBERSHIP_NOT_FOUND');
      }

      return {
        orgUnitId: orgUnit.id,
        tenantId,
        userId: input.userId.trim(),
      };
    },
    event: (result) => ({
      tenantId,
      actorId,
      eventName: 'platform.org_unit_membership.revoked',
      entityType: 'org_unit_membership',
      entityId: result.userId,
      payload: {
        actorId,
        tenantId,
        scope: {
          layer: 'ORG_UNIT',
          tenantId,
          orgUnitId: result.orgUnitId,
        },
        reason: input.reason.trim(),
      },
    }),
  }, trxClient);
};

export const evaluateRequestCapabilities = async (
  trxClient: Knex,
  actor: PlatformAdminActorContext,
  tenantId?: string,
  orgUnitId?: string
) => {
  const evaluation = await trxClient.transaction(async (trx) => {
    const roles = await resolveRequestRoles(trx, actor, tenantId, orgUnitId);

    let scopedTenantId: string | null = null;
    try {
      scopedTenantId = resolveScopedTenantId(actor, tenantId || null);
    } catch (error) {
      if (
        !(error instanceof Error)
        || (error.message !== 'TENANT_ID_REQUIRED' && error.message !== 'TENANT_SCOPE_REQUIRED')
      ) {
        throw error;
      }
    }

    const moduleEntitlements: TenantModuleGrants = {
      connectshyft: false,
      moneyshyft: false,
    };

    if (scopedTenantId) {
      for (const moduleKey of GOVERNED_MODULE_KEYS) {
        const decision = await evaluateActorTenantModuleEntitlement(trx, actor, scopedTenantId, moduleKey);
        moduleEntitlements[moduleKey] = decision.enabled;
      }
    }

    return {
      roles,
      scopedTenantId,
      moduleEntitlements,
    };
  });

  return {
    roles: evaluation.roles,
    capabilities: Array.from(new Set(
      Object.values(CAPABILITIES).filter((capability) => hasCapability(evaluation.roles, capability))
    )),
    tenantId: evaluation.scopedTenantId,
    moduleEntitlements: evaluation.moduleEntitlements,
  };
};
