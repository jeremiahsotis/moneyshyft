import { test as base } from '@playwright/test';
import {
  createStoryG1Context,
  createStoryG1Headers,
  type StoryG1Context,
} from '../factories/connectShyftStoryG1Factory';

type StoryG1Fixtures = {
  storyG1Context: StoryG1Context;
  storyG1MemberHeaders: Record<string, string>;
  storyG1AdminHeaders: Record<string, string>;
  storyG1InboxQuery: string;
  storyG1MineQuery: string;
};

export const test = base.extend<StoryG1Fixtures>({
  storyG1Context: async ({}, use) => {
    await use(createStoryG1Context());
  },
  storyG1MemberHeaders: async ({ storyG1Context }, use) => {
    await use(
      createStoryG1Headers(storyG1Context, {
        orgUnitMemberships: [storyG1Context.orgUnitId],
      }),
    );
  },
  storyG1AdminHeaders: async ({ storyG1Context }, use) => {
    await use(
      createStoryG1Headers(storyG1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG1Context.adminUserId,
        orgUnitMemberships: [storyG1Context.orgUnitId],
      }),
    );
  },
  storyG1InboxQuery: async ({ storyG1Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG1Context.tenantId,
      orgUnitId: storyG1Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyG1MineQuery: async ({ storyG1Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG1Context.tenantId,
      orgUnitId: storyG1Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
