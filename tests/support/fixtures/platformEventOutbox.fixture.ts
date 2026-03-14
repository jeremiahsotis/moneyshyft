import { test as base } from '@playwright/test';
import {
  createEventSchemaExpectation,
  createOperationalIndexExpectations,
  createOutboxSchemaExpectation,
  createPlatformContractHeaders,
} from '../factories/platformEventOutboxFactory';

type PlatformEventOutboxFixtures = {
  platformContractHeaders: ReturnType<typeof createPlatformContractHeaders>;
  eventSchemaExpectation: ReturnType<typeof createEventSchemaExpectation>;
  outboxSchemaExpectation: ReturnType<typeof createOutboxSchemaExpectation>;
  operationalIndexExpectations: ReturnType<
    typeof createOperationalIndexExpectations
  >;
};

export const test = base.extend<PlatformEventOutboxFixtures>({
  platformContractHeaders: async ({}, use) => {
    await use(createPlatformContractHeaders());
  },
  eventSchemaExpectation: async ({}, use) => {
    await use(createEventSchemaExpectation());
  },
  outboxSchemaExpectation: async ({}, use) => {
    await use(createOutboxSchemaExpectation());
  },
  operationalIndexExpectations: async ({}, use) => {
    await use(createOperationalIndexExpectations());
  },
});

export { expect } from '@playwright/test';
