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
  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new TenantScopeError('Tenant context is required for tenant-scoped data access');
  }

  if (tenantId === 'public') {
    throw new TenantScopeError('Protected data access requires a non-public tenant context');
  }

  return tenantId;
};

export const applyTenantScope = <TQuery extends ScopeableQuery<TQuery>>(
  query: TQuery,
  tenantId: string,
  tenantColumn = 'household_id'
): TQuery => {
  const scopedTenantId = requireTenantId(tenantId);
  return query.where({ [tenantColumn]: scopedTenantId });
};
