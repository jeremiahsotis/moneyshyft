import { test as base } from '@playwright/test';
import {
  createStory12Context,
  createStory12TenantHeaders,
} from '../factories/tenantEntitlementFactory';

type Story12Fixtures = {
  story12Context: ReturnType<typeof createStory12Context>;
  tenantAdminHeaders: Record<string, string>;
  systemAdminHeaders: Record<string, string>;
};

export const test = base.extend<Story12Fixtures>({
  story12Context: async ({}, use) => {
    await use(createStory12Context());
  },
  tenantAdminHeaders: async ({ story12Context }, use) => {
    await use(createStory12TenantHeaders(story12Context, { role: 'TENANT_ADMIN' }));
  },
  systemAdminHeaders: async ({ story12Context }, use) => {
    await use(createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' }));
  },
});

export { expect } from '@playwright/test';
