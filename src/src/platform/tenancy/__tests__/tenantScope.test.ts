import { applyTenantScope, requireTenantId, TenantScopeError } from '../tenantScope';

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
});
