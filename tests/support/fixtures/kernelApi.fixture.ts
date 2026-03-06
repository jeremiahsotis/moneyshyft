import { test as base } from '@playwright/test';
import { createKernelRequest } from '../factories/kernelRequestFactory';

type KernelApiFixtures = {
  kernelRequest: ReturnType<typeof createKernelRequest>;
};

export const test = base.extend<KernelApiFixtures>({
  kernelRequest: async ({}, use) => {
    await use(createKernelRequest());
  },
});

export { expect } from '@playwright/test';
