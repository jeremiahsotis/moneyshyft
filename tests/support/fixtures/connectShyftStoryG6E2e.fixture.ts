import { test as base, expect } from '@playwright/test';
import { login } from '../../helpers/auth';

type StoryG6E2eWorkerFixtures = {
  storyG6StorageState: Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;
};

export const test = base.extend<Record<string, never>, StoryG6E2eWorkerFixtures>({
  storyG6StorageState: [
    async ({ browser }, use) => {
      const authContext = await browser.newContext({
        baseURL: process.env.BASE_URL || 'http://localhost:5174',
      });
      const authPage = await authContext.newPage();
      await login(authPage);
      await use(await authContext.storageState());
      await authContext.close();
    },
    { scope: 'worker' },
  ],
  storageState: async ({ storyG6StorageState }, use) => {
    await use(storyG6StorageState);
  },
});

export { expect };
export type { Page, TestInfo } from '@playwright/test';
