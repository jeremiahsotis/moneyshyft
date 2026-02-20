import { test as base } from '@playwright/test';
import {
  createStory16Context,
  createStory16CookiePolicyProbe,
  createStory16CrossTenantReadProbe,
  createStory16CrossTenantWriteProbe,
  createStory16CsrfGuardProbe,
  createStory16RedactionProbe,
  createStory16TenantHeaders,
  type Story16Context,
  type Story16RedactionProbe,
} from '../factories/securityControlsStory16Factory';

type Story16Fixtures = {
  story16Context: Story16Context;
  story16TenantHeaders: Record<string, string>;
  story16CrossTenantReadProbe: ReturnType<typeof createStory16CrossTenantReadProbe>;
  story16CrossTenantWriteProbe: ReturnType<typeof createStory16CrossTenantWriteProbe>;
  story16CsrfGuardProbe: ReturnType<typeof createStory16CsrfGuardProbe>;
  story16CookiePolicyProbe: ReturnType<typeof createStory16CookiePolicyProbe>;
  story16RedactionProbe: Story16RedactionProbe;
};

export const test = base.extend<Story16Fixtures>({
  story16Context: async ({}, use) => {
    await use(createStory16Context());
  },
  story16TenantHeaders: async ({ story16Context }, use) => {
    await use(createStory16TenantHeaders(story16Context));
  },
  story16CrossTenantReadProbe: async ({ story16Context }, use) => {
    await use(createStory16CrossTenantReadProbe(story16Context));
  },
  story16CrossTenantWriteProbe: async ({ story16Context }, use) => {
    await use(createStory16CrossTenantWriteProbe(story16Context));
  },
  story16CsrfGuardProbe: async ({ story16Context }, use) => {
    await use(createStory16CsrfGuardProbe(story16Context));
  },
  story16CookiePolicyProbe: async ({ story16Context }, use) => {
    await use(createStory16CookiePolicyProbe(story16Context));
  },
  story16RedactionProbe: async ({ story16Context }, use) => {
    await use(createStory16RedactionProbe(story16Context));
  },
});

export { expect } from '@playwright/test';
