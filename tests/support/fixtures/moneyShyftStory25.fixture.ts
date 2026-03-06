import { test as base } from '@playwright/test';
import {
  createStory25Context,
  createStory25HappyPayload,
  createStory25Headers,
  createStory25RefusalPayload,
  type Story25Context,
  type Story25Payload,
} from '../factories/moneyShyftStory25Factory';

type Story25Fixtures = {
  story25Context: Story25Context;
  story25Headers: Record<string, string>;
  story25HappyPayload: Story25Payload;
  story25RefusalPayload: Story25Payload;
};

export const test = base.extend<Story25Fixtures>({
  story25Context: async ({}, use) => {
    await use(createStory25Context());
  },
  story25Headers: async ({ story25Context }, use) => {
    await use(createStory25Headers(story25Context));
  },
  story25HappyPayload: async ({ story25Context }, use) => {
    await use(createStory25HappyPayload(story25Context));
  },
  story25RefusalPayload: async ({ story25Context }, use) => {
    await use(createStory25RefusalPayload(story25Context));
  },
});

export { expect } from '@playwright/test';
