import { test as base } from '@playwright/test';
import {
  createStory23Context,
  createStory23HappyPayload,
  createStory23Headers,
  createStory23RefusalPayload,
  type Story23Context,
  type Story23Payload,
} from '../factories/moneyShyftStory23Factory';

type Story23Fixtures = {
  story23Context: Story23Context;
  story23Headers: Record<string, string>;
  story23HappyPayload: Story23Payload;
  story23RefusalPayload: Story23Payload;
};

export const test = base.extend<Story23Fixtures>({
  story23Context: async ({}, use) => {
    await use(createStory23Context());
  },
  story23Headers: async ({ story23Context }, use) => {
    await use(createStory23Headers(story23Context));
  },
  story23HappyPayload: async ({ story23Context }, use) => {
    await use(createStory23HappyPayload(story23Context));
  },
  story23RefusalPayload: async ({ story23Context }, use) => {
    await use(createStory23RefusalPayload(story23Context));
  },
});

export { expect } from '@playwright/test';
