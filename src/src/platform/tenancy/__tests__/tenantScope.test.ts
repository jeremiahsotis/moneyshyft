import {
  applyOrgUnitScope,
  applyTenantScope,
  requireOrgUnitId,
  requireTenantId,
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
});
