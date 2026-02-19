import { createTenantScopeHeaders } from '../factories/tenantRepositoryFactory';

export const tenantContextStory11 = {
  tenantId: 'story11-tenant',
  orgUnitId: 'story11-orgunit',
  alternateOrgUnitId: 'story11-orgunit-alt',
  invalidOrgUnitId: 'story11-invalid-orgunit',
};

type TenantHeaderOverrides = Parameters<typeof createTenantScopeHeaders>[0];

export const createStory11TenantHeaders = (
  overrides: TenantHeaderOverrides = {},
): Record<string, string> => createTenantScopeHeaders({
  tenantId: tenantContextStory11.tenantId,
  orgUnitId: null,
  role: 'TENANT_STAFF',
  ...overrides,
});
