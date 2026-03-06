import { test as base } from '@playwright/test';
import { createTimezoneContext } from '../factories/timezoneContextFactory';

type TimezoneFixtures = {
  timezoneContext: ReturnType<typeof createTimezoneContext>;
};

export const test = base.extend<TimezoneFixtures>({
  timezoneContext: async ({}, use) => {
    await use(createTimezoneContext());
  },
});

export { expect } from '@playwright/test';
