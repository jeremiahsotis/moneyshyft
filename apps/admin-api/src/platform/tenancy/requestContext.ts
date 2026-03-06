import { Request } from 'express';

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

export const resolveTenantRequestContext = (req: Request): TenantRequestContext => {
  const userTenant = normalizeValue(req.user?.activeTenantId || null);
  const userOrgUnit = normalizeValue(req.user?.activeOrgUnitId || null);
  const tenantId = userTenant || 'public';

  const orgUnitId = tenantId === 'public' ? null : userOrgUnit;
  const scopeMode: ScopeMode = orgUnitId ? 'ORG_UNIT' : 'TENANT';

  return {
    tenantId,
    orgUnitId,
    scopeMode,
    source: tenantId === 'public' ? 'public' : 'auth',
  };
};
