type ScopeableQuery<TQuery> = {
  where: (conditions: Record<string, string>) => TQuery;
};

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

export const requireTenantId = (tenantId?: string | null): string => {
  if (typeof tenantId !== 'string') {
    throw new TenantScopeError('Tenant context is required for tenant-scoped data access');
  }

  const normalizedTenantId = tenantId.trim();

  if (normalizedTenantId === '') {
    throw new TenantScopeError('Tenant context is required for tenant-scoped data access');
  }

  if (normalizedTenantId.toLowerCase() === 'public') {
    throw new TenantScopeError('Protected data access requires a non-public tenant context');
  }

  return normalizedTenantId;
};

export const applyTenantScope = <TQuery extends ScopeableQuery<TQuery>>(
  query: TQuery,
  tenantId: string,
  tenantColumn = 'household_id'
): TQuery => {
  const scopedTenantId = requireTenantId(tenantId);
  return query.where({ [tenantColumn]: scopedTenantId });
};

export const requireOrgUnitId = (orgUnitId?: string | null): string => {
  if (typeof orgUnitId !== 'string') {
    throw new TenantScopeError('OrgUnit context is required for orgUnit-scoped data access');
  }

  const normalizedOrgUnitId = orgUnitId.trim();

  if (normalizedOrgUnitId === '') {
    throw new TenantScopeError('OrgUnit context is required for orgUnit-scoped data access');
  }

  return normalizedOrgUnitId;
};

export const applyOrgUnitScope = <TQuery extends ScopeableQuery<TQuery>>(
  query: TQuery,
  tenantId: string,
  orgUnitId: string,
  tenantColumn = 'household_id',
  orgUnitColumn = 'org_unit_id'
): TQuery => {
  const scopedTenantId = requireTenantId(tenantId);
  const scopedOrgUnitId = requireOrgUnitId(orgUnitId);
  return query.where({
    [tenantColumn]: scopedTenantId,
    [orgUnitColumn]: scopedOrgUnitId,
  });
};
