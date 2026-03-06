import { test as base } from '@playwright/test';
import {
  createStoryE6Context,
  type StoryE6Context,
} from '../factories/connectShyftStoryE6Factory';

type StoryE6Fixtures = {
  storyE6Context: StoryE6Context;
};

export const test = base.extend<StoryE6Fixtures>({
  storyE6Context: async ({}, use) => {
    await use(createStoryE6Context());
  },
});

export { expect } from '@playwright/test';
