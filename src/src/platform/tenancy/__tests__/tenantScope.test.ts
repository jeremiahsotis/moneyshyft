import {
  applyScopeMode,
  applyOrgUnitScope,
  applyTenantScope,
  requireOrgUnitId,
  requireTenantId,
  resolveScopeFilters,
  TenantScopeError,
} from '../tenantScope';

describe('tenant scope enforcement', () => {
  it('requires a non-public tenant id', () => {
    expect(() => requireTenantId('')).toThrow(TenantScopeError);
    expect(() => requireTenantId('public')).toThrow(TenantScopeError);
    expect(requireTenantId('house-1')).toBe('house-1');
  });

  it('applies required tenant filter to query builders', () => {
    const whereSpy = jest.fn().mockReturnThis();
    const query = { where: whereSpy };

    applyTenantScope(query, 'house-1');

    expect(whereSpy).toHaveBeenCalledWith({ household_id: 'house-1' });
  });

  it('requires orgunit context for orgUnit-scoped access', () => {
    expect(() => requireOrgUnitId('')).toThrow(TenantScopeError);
    expect(() => requireOrgUnitId(null)).toThrow(TenantScopeError);
    expect(requireOrgUnitId('org-1')).toBe('org-1');
  });

  it('applies tenant + orgunit filters for orgUnit-scoped query builders', () => {
    const whereSpy = jest.fn().mockReturnThis();
    const query = { where: whereSpy };

    applyOrgUnitScope(query, 'house-1', 'org-9');

    expect(whereSpy).toHaveBeenCalledWith({
      household_id: 'house-1',
      org_unit_id: 'org-9',
    });
  });

  it('resolves tenant-only filters for tenant scope mode', () => {
    expect(
      resolveScopeFilters({
        tenantId: 'tenant-a',
        orgUnitId: null,
        scopeMode: 'TENANT',
      })
    ).toEqual({
      tenant_id: 'tenant-a',
    });
  });

  it('resolves tenant + orgunit filters for orgUnit scope mode', () => {
    expect(
      resolveScopeFilters({
        tenantId: 'tenant-a',
        orgUnitId: 'org-1',
        scopeMode: 'ORG_UNIT',
      })
    ).toEqual({
      tenant_id: 'tenant-a',
      org_unit_id: 'org-1',
    });
  });

  it('rejects orgUnit scope mode when orgunit context is missing', () => {
    expect(() =>
      resolveScopeFilters({
        tenantId: 'tenant-a',
        orgUnitId: null,
        scopeMode: 'ORG_UNIT',
      })
    ).toThrow(TenantScopeError);
  });

  it('applies scope-mode filters with configurable column names', () => {
    const whereSpy = jest.fn().mockReturnThis();
    const query = { where: whereSpy };

    applyScopeMode(query, {
      tenantId: 'house-1',
      orgUnitId: 'org-2',
      scopeMode: 'ORG_UNIT',
    }, 'household_id', 'org_unit_id');

    expect(whereSpy).toHaveBeenCalledWith({
      household_id: 'house-1',
      org_unit_id: 'org-2',
    });
  });
});
