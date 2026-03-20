import { Request, Response } from 'express';
import type { Knex } from 'knex';
import { refusal } from '../../platform/envelopes/response';
import { CAPABILITIES, hasCapability, type Capability } from '../../platform/rbac/capabilities';
import {
  createKnexOrgUnitAccessStore,
  validateOrgUnitScopedAccess,
} from '../../platform/tenancy/orgUnitAccess';
import {
  evaluateActorTenantModuleEntitlement,
  type PlatformAdminActorContext,
} from '../../platform/tenantModuleEntitlements';
import {
  resolveConnectShyftOrgUnitContext,
  type ConnectShyftContextDecision,
  type ResolvedConnectShyftContext,
} from '../contextAccess';
import {
  evaluateConnectShyftCapability,
  isConnectShyftTestOverrideEnabled,
  mergeConnectShyftFlagsWithEntitlement,
  resolveConnectShyftFeatureFlags,
  type ConnectShyftCapability,
  type ConnectShyftFeatureFlags,
} from '../featureFlags';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEST_USER_ID_HEADER = 'x-test-connectshyft-user-id';
const TEST_TENANT_OVERRIDE_HEADER = 'x-test-connectshyft-tenant-id';
const CONNECTSHYFT_LEGACY_ROLE_ALIASES: Record<string, string> = {
  admin: 'TENANT_ADMIN',
  member: 'ORGUNIT_MEMBER',
};

export type ConnectShyftRouteRefusalInput = {
  code: string;
  message: string;
  refusalType: 'business' | 'security';
  httpStatus?: number;
  data?: unknown;
};

export type ConnectShyftEntitlementAwareFlagsResult = {
  flags: ConnectShyftFeatureFlags;
  entitlementDecision: Awaited<ReturnType<typeof evaluateActorTenantModuleEntitlement>> | null;
};

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const actorFromRequest = (req: Request): PlatformAdminActorContext => ({
  userId: req.user?.userId || null,
  baseRole: req.user?.role || null,
  headerRoles: [],
  activeTenantId: req.user?.activeTenantId || null,
});

export const loadConnectShyftPlatformDb = (): Knex => {
  const knexModule = require('../../../config/knex') as { default: Knex };
  return knexModule.default;
};

export const sendConnectShyftRouteRefusal = (
  res: Response,
  input: ConnectShyftRouteRefusalInput,
) => refusal(res, {
  code: input.code,
  message: input.message,
  refusalType: input.refusalType,
  httpStatus: input.httpStatus ?? 200,
  data: input.data,
});

export const respondWithConnectShyftContextRefusal = (
  res: Response,
  decision: Extract<ConnectShyftContextDecision, { ok: false }>,
) => sendConnectShyftRouteRefusal(res, {
  code: decision.code,
  message: decision.message,
  refusalType: decision.refusalType,
  httpStatus: decision.httpStatus,
});

export const resolveConnectShyftRequestedRole = (req: Request): string | null => {
  const normalizeRequestedRole = (inputRole: unknown): string | null => {
    if (typeof inputRole !== 'string' || inputRole.trim().length === 0) {
      return null;
    }

    const normalizedBaseRole = inputRole.trim();
    const legacyAlias = CONNECTSHYFT_LEGACY_ROLE_ALIASES[normalizedBaseRole.toLowerCase()];
    if (legacyAlias) {
      return legacyAlias;
    }

    return normalizedBaseRole;
  };

  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideRole = req.header('x-test-connectshyft-role');
    const resolvedOverrideRole = normalizeRequestedRole(testOverrideRole);
    if (resolvedOverrideRole) {
      return resolvedOverrideRole;
    }
  }

  return normalizeRequestedRole(req.user?.role);
};

export const resolveConnectShyftRequestedActorUserId = (req: Request): string | null => {
  if (isConnectShyftTestOverrideEnabled()) {
    const testOverrideUserId = req.header(TEST_USER_ID_HEADER);
    if (typeof testOverrideUserId === 'string') {
      const normalizedOverrideUserId = testOverrideUserId.trim();
      return normalizedOverrideUserId.length > 0 ? normalizedOverrideUserId : null;
    }
  }

  if (typeof req.user?.userId === 'string') {
    const normalizedActorUserId = req.user.userId.trim();
    return normalizedActorUserId.length > 0 ? normalizedActorUserId : null;
  }

  return null;
};

export const resolveConnectShyftActorRoles = (
  req: Request,
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): string[] => {
  const requestedRole = resolveConnectShyftRequestedRole(req);
  const contextRoles = Array.isArray(context?.effectiveRoles)
    ? context.effectiveRoles
      .filter((role): role is string => typeof role === 'string')
      .map((role) => role.trim())
      .filter((role) => role.length > 0)
    : [];
  const deduped = Array.from(new Set(contextRoles));

  if (requestedRole && !deduped.includes(requestedRole)) {
    deduped.push(requestedRole);
  }

  return deduped;
};

export const requestHasAnyCapability = (
  req: Request,
  capabilities: readonly Capability[],
  context?: Pick<ResolvedConnectShyftContext, 'effectiveRoles'> | null,
): boolean => {
  const actorRoles = resolveConnectShyftActorRoles(req, context);
  return capabilities.some((capability) => hasCapability(actorRoles, capability));
};

const resolveTenantIdFromRequest = async (req: Request): Promise<string | null> => {
  const directTenantCandidates = [
    req.user?.activeTenantId || null,
    req.user?.householdId || null,
    req.tenantContext?.tenantId || null,
    req.tenantId || null,
  ]
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null)
    .filter((value) => UUID_PATTERN.test(value));

  if (directTenantCandidates.length > 0) {
    return directTenantCandidates[0];
  }

  const actorUserId = normalizeNonEmptyString(req.user?.userId || null);
  if (!actorUserId || !UUID_PATTERN.test(actorUserId)) {
    return null;
  }

  const membershipRows = await loadConnectShyftPlatformDb()
    .withSchema('platform')
    .table('tenant_memberships')
    .where('user_id', actorUserId)
    .select('tenant_id')
    .orderBy('tenant_id', 'asc')
    .limit(2);

  const membershipTenantIds = Array.from(
    new Set(
      membershipRows
        .map((row) => normalizeNonEmptyString((row as { tenant_id?: unknown }).tenant_id))
        .filter((value): value is string => value !== null && UUID_PATTERN.test(value)),
    ),
  );

  if (membershipTenantIds.length === 1) {
    return membershipTenantIds[0];
  }

  return null;
};

const resolveConnectShyftFallbackOrgUnitId = async (req: Request): Promise<string | null> => {
  if (req.tenantContext?.orgUnitId || req.orgUnitId || req.user?.activeOrgUnitId) {
    return null;
  }

  const actorUserId = req.user?.userId || null;
  const tenantId = await resolveTenantIdFromRequest(req);
  if (!actorUserId || !tenantId || !UUID_PATTERN.test(tenantId)) {
    return null;
  }

  const db = loadConnectShyftPlatformDb();
  const directMembershipRows = await db
    .withSchema('platform')
    .table('org_unit_memberships as om')
    .join('org_units as ou', 'ou.id', 'om.org_unit_id')
    .where('om.user_id', actorUserId)
    .andWhere('ou.tenant_id', tenantId)
    .select('om.org_unit_id as orgUnitId')
    .orderBy('om.org_unit_id', 'asc');

  const directMembershipOrgUnitIds = Array.from(
    new Set(
      directMembershipRows
        .map((row) => normalizeNonEmptyString((row as { orgUnitId?: unknown }).orgUnitId))
        .filter((value): value is string => value !== null),
    ),
  );

  if (directMembershipOrgUnitIds.length === 1) {
    return directMembershipOrgUnitIds[0];
  }

  if (directMembershipOrgUnitIds.length > 1) {
    return null;
  }

  const requestedRole = resolveConnectShyftRequestedRole(req);
  if (!hasCapability([requestedRole], CAPABILITIES.TENANT_READ_ALL)) {
    return null;
  }

  const tenantOrgUnitRows = await db
    .withSchema('platform')
    .table('org_units')
    .where('tenant_id', tenantId)
    .select('id')
    .orderBy('id', 'asc')
    .limit(2);

  if (tenantOrgUnitRows.length !== 1) {
    return null;
  }

  return normalizeNonEmptyString((tenantOrgUnitRows[0] as { id?: unknown }).id);
};

const applyConnectShyftFallbackOrgUnitContext = async (req: Request): Promise<void> => {
  const fallbackOrgUnitId = await resolveConnectShyftFallbackOrgUnitId(req);
  if (!fallbackOrgUnitId) {
    return;
  }

  req.orgUnitId = fallbackOrgUnitId;
  req.tenantContext = {
    tenantId: req.tenantContext?.tenantId || req.tenantId || req.user?.activeTenantId || 'public',
    orgUnitId: fallbackOrgUnitId,
    scopeMode: 'ORG_UNIT',
    source: req.tenantContext?.source || 'auth',
  };
};

const resolveConnectShyftEnabledByOrgUnitOverride = async (
  req: Request,
  tenantId: string,
): Promise<boolean> => {
  if (!UUID_PATTERN.test(tenantId)) {
    return false;
  }

  const directOrgUnitCandidates = [
    req.tenantContext?.orgUnitId || null,
    req.orgUnitId || null,
    req.user?.activeOrgUnitId || null,
  ]
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null && UUID_PATTERN.test(value));

  const actorUserId = normalizeNonEmptyString(req.user?.userId || null);
  const membershipOrgUnitIds = actorUserId && UUID_PATTERN.test(actorUserId)
    ? (
      await loadConnectShyftPlatformDb()
        .withSchema('platform')
        .table('org_unit_memberships as om')
        .join('org_units as ou', 'ou.id', 'om.org_unit_id')
        .where('om.user_id', actorUserId)
        .andWhere('ou.tenant_id', tenantId)
        .select('om.org_unit_id as orgUnitId')
        .orderBy('om.org_unit_id', 'asc')
    )
      .map((row) => normalizeNonEmptyString((row as { orgUnitId?: unknown }).orgUnitId))
      .filter((value): value is string => value !== null && UUID_PATTERN.test(value))
    : [];

  const scopedOrgUnitIds = Array.from(new Set([...directOrgUnitCandidates, ...membershipOrgUnitIds]));
  if (scopedOrgUnitIds.length === 0) {
    return false;
  }

  const enabledOverride = await loadConnectShyftPlatformDb()
    .withSchema('platform')
    .table('org_unit_module_overrides')
    .where('tenant_id', tenantId)
    .andWhere('module_key', 'connectshyft')
    .whereIn('org_unit_id', scopedOrgUnitIds)
    .andWhere('enabled', true)
    .first(['id']);

  return Boolean(enabledOverride);
};

const shouldBypassTestHarnessEntitlementLookup = (req: Request, tenantId: string): boolean => {
  if (!isConnectShyftTestOverrideEnabled()) {
    return false;
  }

  if (!UUID_PATTERN.test(tenantId)) {
    return true;
  }

  const testTenantOverride = req.header(TEST_TENANT_OVERRIDE_HEADER);
  return typeof testTenantOverride === 'string' && testTenantOverride.trim().length > 0;
};

export const resolveEntitlementAwareConnectShyftFlags = async (
  req: Request,
): Promise<ConnectShyftEntitlementAwareFlagsResult> => {
  const resolvedFlags = resolveConnectShyftFeatureFlags(req);
  const tenantId = await resolveTenantIdFromRequest(req);
  if (!tenantId) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  if (shouldBypassTestHarnessEntitlementLookup(req, tenantId)) {
    return {
      flags: resolvedFlags,
      entitlementDecision: null,
    };
  }

  const entitlementDecision = await evaluateActorTenantModuleEntitlement(
    loadConnectShyftPlatformDb(),
    actorFromRequest(req),
    tenantId,
    'connectshyft',
  );
  const orgUnitScopedEnablement = await resolveConnectShyftEnabledByOrgUnitOverride(req, tenantId);
  const moduleEnabled = entitlementDecision.enabled || orgUnitScopedEnablement;

  return {
    flags: mergeConnectShyftFlagsWithEntitlement(resolvedFlags, {
      moduleEnabled,
    }),
    entitlementDecision,
  };
};

export const enforceConnectShyftCapability = async (
  req: Request,
  res: Response,
  capability: ConnectShyftCapability,
): Promise<ConnectShyftFeatureFlags | null> => {
  const { flags, entitlementDecision } = await resolveEntitlementAwareConnectShyftFlags(req);
  const evaluation = evaluateConnectShyftCapability(flags, capability);
  if (evaluation.ok) {
    return flags;
  }

  const moduleDeniedByEntitlement =
    evaluation.code === 'CONNECTSHYFT_MODULE_DISABLED'
    && entitlementDecision
    && !entitlementDecision.enabled;

  sendConnectShyftRouteRefusal(res, {
    code: moduleDeniedByEntitlement ? entitlementDecision.refusalCode : evaluation.code,
    message: moduleDeniedByEntitlement ? entitlementDecision.message : evaluation.message,
    refusalType: evaluation.refusalType,
    httpStatus: 200,
    data: moduleDeniedByEntitlement
      ? {
        moduleKey: entitlementDecision.moduleKey,
        tenantId: entitlementDecision.tenantId,
        reason: entitlementDecision.reason,
      }
      : undefined,
  });

  return null;
};

export const resolveConnectShyftRouteContextDecision = async (
  req: Request,
  options: {
    attemptedOrgUnitId?: string | null;
  } = {},
): Promise<ConnectShyftContextDecision> => {
  await applyConnectShyftFallbackOrgUnitContext(req);

  return resolveConnectShyftOrgUnitContext(req, {
    attemptedOrgUnitId: options.attemptedOrgUnitId,
    resolveOrgUnitAccess: async ({ tenantId, orgUnitId, userId, baseRoles }) =>
      validateOrgUnitScopedAccess(
        createKnexOrgUnitAccessStore(loadConnectShyftPlatformDb()),
        {
          tenantId,
          orgUnitId,
          userId,
          baseRoles,
        },
      ),
  });
};
