import { test as base } from '@playwright/test';
import {
  createStory24Context,
  createStory24HappyPayload,
  createStory24Headers,
  createStory24RefusalPayload,
  type Story24Context,
  type Story24Payload,
} from '../factories/routeShyftStory24Factory';

type Story24Fixtures = {
  story24Context: Story24Context;
  story24Headers: Record<string, string>;
  story24HappyPayload: Story24Payload;
  story24RefusalPayload: Story24Payload;
};

export const test = base.extend<Story24Fixtures>({
  story24Context: async ({}, use) => {
    await use(createStory24Context());
  },
  story24Headers: async ({ story24Context }, use) => {
    await use(createStory24Headers(story24Context));
  },
  story24HappyPayload: async ({ story24Context }, use) => {
    await use(createStory24HappyPayload(story24Context));
  },
  story24RefusalPayload: async ({ story24Context }, use) => {
    await use(createStory24RefusalPayload(story24Context));
  },
});

export { expect } from '@playwright/test';
