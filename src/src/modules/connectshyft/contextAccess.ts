import { Request } from 'express';
import type { OrgUnitAccessDecision } from '../../platform/tenancy/orgUnitAccess';
import { CAPABILITIES, hasCapability } from '../../platform/rbac/capabilities';
import { requireTenantId, TenantScopeError } from '../../platform/tenancy/tenantScope';
import type { JWTPayload } from '../../utils/jwt';
import { isConnectShyftTestOverrideEnabled } from './featureFlags';

type ConnectShyftRefusalType = 'business' | 'security';

type RefusalDecision = {
  ok: false;
  code: string;
  message: string;
  refusalType: ConnectShyftRefusalType;
  httpStatus: number;
};

export type ResolvedConnectShyftContext = {
  tenantId: string;
  orgUnitId: string;
  bypassedOrgUnitMembership: boolean;
};

type SuccessDecision = {
  ok: true;
  context: ResolvedConnectShyftContext;
};

export type ConnectShyftContextDecision = SuccessDecision | RefusalDecision;

type ResolveConnectShyftContextOptions = {
  attemptedOrgUnitId?: string | null;
  resolveOrgUnitAccess?: (input: {
    tenantId: string;
    orgUnitId: string;
    userId: string;
    baseRoles?: Array<string | null | undefined>;
  }) => Promise<OrgUnitAccessDecision>;
};

const TENANT_PREFIX = 'tenant-connectshyft-';
const ORG_UNIT_PREFIX = 'org-connectshyft-';
const TEST_MEMBERSHIP_HEADER = 'x-test-connectshyft-orgunit-memberships';
const TEST_TENANT_HEADER = 'x-test-connectshyft-tenant-id';
const TEST_ORG_UNIT_HEADER = 'x-test-connectshyft-orgunit-id';
const TEST_ROLE_HEADER = 'x-test-connectshyft-role';
const TEST_USER_HEADER = 'x-test-connectshyft-user-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const refusal = (
  code: string,
  message: string,
  refusalType: ConnectShyftRefusalType = 'business',
  httpStatus = 200,
): RefusalDecision => ({
  ok: false,
  code,
  message,
  refusalType,
  httpStatus,
});

const normalizeContextValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isConnectShyftTenantId = (tenantId: string): boolean => {
  if (!tenantId.startsWith(TENANT_PREFIX)) {
    return false;
  }

  const suffix = tenantId.slice(TENANT_PREFIX.length);
  return suffix.length > 0 && SLUG_PATTERN.test(suffix);
};

const isConnectShyftOrgUnitId = (orgUnitId: string): boolean => {
  if (!orgUnitId.startsWith(ORG_UNIT_PREFIX)) {
    return false;
  }

  const suffix = orgUnitId.slice(ORG_UNIT_PREFIX.length);
  return suffix.length > 0 && SLUG_PATTERN.test(suffix);
};

const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

const isValidOrgUnitContext = (orgUnitId: string): boolean => {
  if (isUuid(orgUnitId)) {
    return true;
  }

  // Legacy synthetic IDs are supported only when ConnectShyft test harness flags are enabled.
  return isTestMembershipHeaderEnabled() && isConnectShyftOrgUnitId(orgUnitId);
};

const isValidTenantContext = (tenantId: string): boolean => {
  if (isUuid(tenantId)) {
    return true;
  }

  // Legacy synthetic IDs are supported only when ConnectShyft test harness flags are enabled.
  return isTestMembershipHeaderEnabled() && isConnectShyftTenantId(tenantId);
};

const resolveConnectShyftTenantSegment = (tenantId: string): string | null => {
  if (!isConnectShyftTenantId(tenantId)) {
    return null;
  }

  return tenantId.slice(TENANT_PREFIX.length);
};

const resolveConnectShyftOrgUnitTenantSegment = (orgUnitId: string): string | null => {
  if (!isConnectShyftOrgUnitId(orgUnitId)) {
    return null;
  }

  const suffix = orgUnitId.slice(ORG_UNIT_PREFIX.length);
  const lastDelimiterIndex = suffix.lastIndexOf('-');

  if (lastDelimiterIndex <= 0) {
    return null;
  }

  return suffix.slice(0, lastDelimiterIndex);
};

const isCrossTenantOrgUnit = (tenantId: string, orgUnitId: string): boolean => {
  const tenantSegment = resolveConnectShyftTenantSegment(tenantId);
  const orgUnitTenantSegment = resolveConnectShyftOrgUnitTenantSegment(orgUnitId);

  if (!tenantSegment || !orgUnitTenantSegment) {
    return false;
  }

  return tenantSegment !== orgUnitTenantSegment;
};

const isTestMembershipHeaderEnabled = (): boolean =>
  isConnectShyftTestOverrideEnabled();

const resolveTestHarnessUser = (
  req: Pick<Request, 'header'>,
): JWTPayload | null => {
  if (!isTestMembershipHeaderEnabled()) {
    return null;
  }

  const tenantId = normalizeContextValue(req.header(TEST_TENANT_HEADER));
  const role = normalizeContextValue(req.header(TEST_ROLE_HEADER));
  const userId = normalizeContextValue(req.header(TEST_USER_HEADER));
  const orgUnitId = normalizeContextValue(req.header(TEST_ORG_UNIT_HEADER));

  if (!tenantId || !role || !userId) {
    return null;
  }

  return {
    userId,
    email: `${userId}@connectshyft.test`,
    householdId: tenantId,
    activeTenantId: tenantId,
    activeOrgUnitId: orgUnitId,
    role,
  };
};

const resolveHeaderMemberships = (
  req: Pick<Request, 'header'>,
): Set<string> | null => {
  if (!isTestMembershipHeaderEnabled()) {
    return null;
  }

  const rawHeader = req.header(TEST_MEMBERSHIP_HEADER);
  if (!rawHeader) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawHeader);
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    const memberships = parsed
      .map((entry) => normalizeContextValue(typeof entry === 'string' ? entry : null))
      .filter((entry): entry is string => entry !== null);

    return new Set(memberships);
  } catch (_error) {
    return new Set<string>();
  }
};

const isTenantPrivilegedRole = (role: string | null | undefined): boolean => {
  return hasCapability([role || null], CAPABILITIES.TENANT_READ_ALL);
};

const mapOrgUnitAccessFailure = (
  reason: Exclude<OrgUnitAccessDecision, { ok: true }>['reason'],
): RefusalDecision => {
  if (reason === 'ORG_UNIT_TENANT_MISMATCH') {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
      'orgUnit context does not belong to the active tenant',
    );
  }

  if (reason === 'ORG_UNIT_NOT_FOUND') {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      'orgUnit context is invalid for ConnectShyft routes',
    );
  }

  return refusal(
    'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
    'orgUnit membership is required for this ConnectShyft route',
  );
};

const resolveMembershipFromTestHeader = (
  req: Pick<Request, 'header'>,
  tenantId: string,
  orgUnitId: string,
  role: string | null | undefined,
): ConnectShyftContextDecision | null => {
  const memberships = resolveHeaderMemberships(req);
  if (!memberships) {
    return null;
  }

  if (isTenantPrivilegedRole(role)) {
    return {
      ok: true,
      context: {
        tenantId,
        orgUnitId,
        bypassedOrgUnitMembership: true,
      },
    };
  }

  if (!memberships.has(orgUnitId)) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      'orgUnit membership is required for this ConnectShyft route',
    );
  }

  return {
    ok: true,
    context: {
      tenantId,
      orgUnitId,
      bypassedOrgUnitMembership: false,
    },
  };
};

const requiresAuthoritativeOrgUnitAccessCheck = (tenantId: string, orgUnitId: string): boolean => {
  return isUuid(tenantId) && isUuid(orgUnitId);
};

export const resolveConnectShyftOrgUnitContext = async (
  req: Pick<Request, 'tenantContext' | 'tenantId' | 'orgUnitId' | 'user' | 'header'>,
  options: ResolveConnectShyftContextOptions = {},
): Promise<ConnectShyftContextDecision> => {
  const resolvedUser = resolveTestHarnessUser(req) || req.user;

  if (!resolvedUser?.userId) {
    return refusal(
      'CONNECTSHYFT_AUTH_CONTEXT_REQUIRED',
      'Authenticated user context is required for ConnectShyft orgUnit-scoped routes',
      'security',
      403,
    );
  }

  let tenantId: string;
  try {
    tenantId = requireTenantId(
      req.tenantContext?.tenantId
      || req.tenantId
      || resolvedUser.activeTenantId
      || resolvedUser.householdId
      || null,
    );
  } catch (error) {
    const message = error instanceof TenantScopeError
      ? error.message
      : 'Tenant context is required for ConnectShyft routes';

    return refusal(
      'CONNECTSHYFT_TENANT_CONTEXT_REQUIRED',
      message,
      'security',
      403,
    );
  }

  if (!isValidTenantContext(tenantId)) {
    return refusal(
      'CONNECTSHYFT_TENANT_CONTEXT_REQUIRED',
      'Tenant context is invalid for ConnectShyft routes',
      'security',
      403,
    );
  }

  const canonicalOrgUnitId = normalizeContextValue(
    req.tenantContext?.orgUnitId
    || req.orgUnitId
    || resolvedUser.activeOrgUnitId
    || null,
  );

  if (!canonicalOrgUnitId) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
      'orgUnit context is required for ConnectShyft orgUnit-scoped routes',
    );
  }

  if (!isValidOrgUnitContext(canonicalOrgUnitId)) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
      'orgUnit context is invalid for ConnectShyft routes',
    );
  }

  if (isCrossTenantOrgUnit(tenantId, canonicalOrgUnitId)) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
      'orgUnit context does not belong to the active tenant',
    );
  }

  const spoofedHeaderOrgUnit = normalizeContextValue(req.header('x-active-org-unit-id'));
  if (spoofedHeaderOrgUnit && spoofedHeaderOrgUnit !== canonicalOrgUnitId) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
      'Spoofed or cross-orgUnit context overrides are not allowed',
      'security',
      403,
    );
  }

  const attemptedOrgUnitId = normalizeContextValue(options.attemptedOrgUnitId || null);
  if (attemptedOrgUnitId) {
    if (!isValidOrgUnitContext(attemptedOrgUnitId)) {
      return refusal(
        'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
        'orgUnit context is invalid for ConnectShyft routes',
      );
    }

    if (isCrossTenantOrgUnit(tenantId, attemptedOrgUnitId)) {
      return refusal(
        'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
        'orgUnit context does not belong to the active tenant',
      );
    }

    if (attemptedOrgUnitId !== canonicalOrgUnitId) {
      return refusal(
        'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
        'Cross-orgUnit context overrides are not allowed for this route',
      );
    }
  }

  const headerDecision = resolveMembershipFromTestHeader(
    req,
    tenantId,
    canonicalOrgUnitId,
    resolvedUser.role,
  );
  if (headerDecision) {
    return headerDecision;
  }

  if (!requiresAuthoritativeOrgUnitAccessCheck(tenantId, canonicalOrgUnitId)) {
    if (isTestMembershipHeaderEnabled() && isTenantPrivilegedRole(resolvedUser.role)) {
      return {
        ok: true,
        context: {
          tenantId,
          orgUnitId: canonicalOrgUnitId,
          bypassedOrgUnitMembership: true,
        },
      };
    }

    return refusal(
      'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
      'orgUnit membership is required for this ConnectShyft route',
    );
  }

  if (!options.resolveOrgUnitAccess) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_ACCESS_VALIDATION_UNAVAILABLE',
      'Unable to validate orgUnit membership for this ConnectShyft route',
      'security',
      500,
    );
  }

  try {
    const decision = await options.resolveOrgUnitAccess({
      tenantId,
      orgUnitId: canonicalOrgUnitId,
      userId: resolvedUser.userId,
      baseRoles: [resolvedUser.role || null],
    });

    if (!decision.ok) {
      return mapOrgUnitAccessFailure(decision.reason);
    }

    return {
      ok: true,
      context: {
        tenantId,
        orgUnitId: canonicalOrgUnitId,
        bypassedOrgUnitMembership: decision.bypassedOrgUnitMembership,
      },
    };
  } catch (_error) {
    return refusal(
      'CONNECTSHYFT_ORGUNIT_ACCESS_VALIDATION_FAILED',
      'Unable to validate orgUnit membership for this ConnectShyft route',
      'security',
      500,
    );
  }
};
