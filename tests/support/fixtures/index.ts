import { expect, test as base } from '@playwright/test';
import { UserFactory } from './factories/userFactory';

type AppFixtures = {
  userFactory: UserFactory;
};

export const test = base.extend<AppFixtures>({
  userFactory: async ({}, use) => {
    const userFactory = new UserFactory();
    await use(userFactory);
    await userFactory.cleanup();
  },
});

export { expect };
