import { test as base } from '@playwright/test';
import {
  createAtomicMutationProbe,
  createMissingWriteProbe,
  createMutationWrapperHeaders,
} from '../factories/mutationTransactionWrapperFactory';

type MutationTransactionWrapperFixtures = {
  mutationWrapperHeaders: ReturnType<typeof createMutationWrapperHeaders>;
  atomicMutationProbe: ReturnType<typeof createAtomicMutationProbe>;
  missingEventProbe: ReturnType<typeof createMissingWriteProbe>;
  missingOutboxProbe: ReturnType<typeof createMissingWriteProbe>;
};

export const test = base.extend<MutationTransactionWrapperFixtures>({
  mutationWrapperHeaders: async ({}, use) => {
    await use(createMutationWrapperHeaders());
  },
  atomicMutationProbe: async ({}, use) => {
    await use(createAtomicMutationProbe());
  },
  missingEventProbe: async ({}, use) => {
    await use(createMissingWriteProbe({ missingWrite: 'event' }));
  },
  missingOutboxProbe: async ({}, use) => {
    await use(createMissingWriteProbe({ missingWrite: 'outbox' }));
  },
});

export { expect } from '@playwright/test';
