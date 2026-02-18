import { Request } from 'express';
import { normalizeRole } from '../rbac/capabilities';

export type ScopeMode = 'TENANT' | 'ORG_UNIT';

export interface TenantRequestContext {
  tenantId: string;
  orgUnitId: string | null;
  scopeMode: ScopeMode;
  source: 'auth' | 'public';
}

const normalizeValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isSystemAdmin = (role: string | null | undefined): boolean => normalizeRole(role) === 'SYSTEM_ADMIN';

export const resolveTenantRequestContext = (req: Request): TenantRequestContext => {
  const userTenant = normalizeValue(req.user?.activeTenantId || req.user?.householdId || null);
  const isSystem = isSystemAdmin(req.user?.role || null);

  const headerTenant = normalizeValue(req.header('x-active-tenant-id'));
  const cookieTenant = normalizeValue(req.cookies?.active_tenant_id);
  const requestedTenant = headerTenant || cookieTenant;

  const tenantId = (isSystem && requestedTenant) ? requestedTenant : (userTenant || 'public');

  const headerOrgUnit = normalizeValue(req.header('x-active-org-unit-id'));
  const cookieOrgUnit = normalizeValue(req.cookies?.active_org_unit_id);
  const orgUnitCandidate = headerOrgUnit || cookieOrgUnit;

  const orgUnitId = tenantId === 'public' ? null : orgUnitCandidate;
  const scopeMode: ScopeMode = orgUnitId ? 'ORG_UNIT' : 'TENANT';

  return {
    tenantId,
    orgUnitId,
    scopeMode,
    source: tenantId === 'public' ? 'public' : 'auth',
  };
};
