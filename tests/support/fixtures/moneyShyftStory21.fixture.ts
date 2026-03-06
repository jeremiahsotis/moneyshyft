import { test as base } from '@playwright/test';
import {
  createStory21Context,
  createStory21CreatePayload,
  createStory21Headers,
  createStory21InvalidTransitionPayload,
  createStory21TerminalTransitionPayload,
  createStory21ValidTransitionPayload,
  type Story21Context,
  type Story21CreatePayload,
  type Story21TransitionPayload,
} from '../factories/moneyShyftStory21Factory';

type Story21Fixtures = {
  story21Context: Story21Context;
  story21Headers: Record<string, string>;
  story21CreatePayload: Story21CreatePayload;
  story21ValidTransitionPayload: Story21TransitionPayload;
  story21InvalidTransitionPayload: Story21TransitionPayload;
  story21TerminalTransitionPayload: Story21TransitionPayload;
};

export const test = base.extend<Story21Fixtures>({
  story21Context: async ({}, use) => {
    await use(createStory21Context());
  },
  story21Headers: async ({ story21Context }, use) => {
    await use(createStory21Headers(story21Context));
  },
  story21CreatePayload: async ({ story21Context }, use) => {
    await use(createStory21CreatePayload(story21Context));
  },
  story21ValidTransitionPayload: async ({}, use) => {
    await use(createStory21ValidTransitionPayload());
  },
  story21InvalidTransitionPayload: async ({}, use) => {
    await use(createStory21InvalidTransitionPayload());
  },
  story21TerminalTransitionPayload: async ({}, use) => {
    await use(createStory21TerminalTransitionPayload());
  },
});

export { expect } from '@playwright/test';
