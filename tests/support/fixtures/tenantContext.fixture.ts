import { test as base } from '@playwright/test';
import { createCrossTenantProbe, createTenantScopeHeaders } from '../factories/tenantRepositoryFactory';

type TenantContextFixtures = {
  tenantHeaders: ReturnType<typeof createTenantScopeHeaders>;
  crossTenantProbe: ReturnType<typeof createCrossTenantProbe>;
};

export const test = base.extend<TenantContextFixtures>({
  tenantHeaders: async ({}, use) => {
    await use(createTenantScopeHeaders());
  },
  crossTenantProbe: async ({}, use) => {
    await use(createCrossTenantProbe());
  },
});

export { expect } from '@playwright/test';
