import { test as base } from '@playwright/test';
import {
  createStory22Context,
  createStory22HappyPayload,
  createStory22Headers,
  createStory22InvalidPayloadMissingRequired,
  createStory22RefusalPayload,
  type Story22Context,
  type Story22Payload,
} from '../factories/routeShyftStory22Factory';

type Story22Fixtures = {
  story22Context: Story22Context;
  story22Headers: Record<string, string>;
  story22HappyPayload: Story22Payload;
  story22RefusalPayload: Story22Payload;
  story22InvalidPayloadMissingRequired: Story22Payload;
  story22RequiredUiTestIds: readonly string[];
};

export const test = base.extend<Story22Fixtures>({
  story22Context: async ({}, use) => {
    await use(createStory22Context());
  },
  story22Headers: async ({ story22Context }, use) => {
    await use(createStory22Headers(story22Context));
  },
  story22HappyPayload: async ({ story22Context }, use) => {
    await use(createStory22HappyPayload(story22Context));
  },
  story22RefusalPayload: async ({ story22Context }, use) => {
    await use(createStory22RefusalPayload(story22Context));
  },
  story22InvalidPayloadMissingRequired: async ({ story22Context }, use) => {
    await use(createStory22InvalidPayloadMissingRequired(story22Context));
  },
  story22RequiredUiTestIds: async ({ story22Context }, use) => {
    await use(story22Context.requiredTestIds);
  },
});

export { expect } from '@playwright/test';
