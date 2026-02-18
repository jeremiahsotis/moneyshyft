import { test as base } from '@playwright/test';
import {
  createKernelReadinessContext,
  type KernelReadinessContext,
} from '../factories/kernelReadinessContextFactory';

type KernelReadinessFixtures = {
  kernelReadinessContext: KernelReadinessContext;
};

export const test = base.extend<KernelReadinessFixtures>({
  kernelReadinessContext: async ({}, use) => {
    await use(createKernelReadinessContext());
  },
});

export { expect } from '@playwright/test';
