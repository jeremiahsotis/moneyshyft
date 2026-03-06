import { test as base } from '@playwright/test';
import {
  createStoryUxR1Context,
  createStoryUxR1Headers,
  type StoryUxR1Context,
} from '../factories/connectShyftStoryUxR1Factory';

type StoryUxR1Fixtures = {
  storyUxR1Context: StoryUxR1Context;
  storyUxR1MemberHeaders: Record<string, string>;
  storyUxR1AdminHeaders: Record<string, string>;
  storyUxR1InboxQuery: string;
  storyUxR1MineQuery: string;
};

export const test = base.extend<StoryUxR1Fixtures>({
  storyUxR1Context: async ({}, use) => {
    await use(createStoryUxR1Context());
  },
  storyUxR1MemberHeaders: async ({ storyUxR1Context }, use) => {
    await use(
      createStoryUxR1Headers(storyUxR1Context, {
        orgUnitMemberships: [storyUxR1Context.orgUnitId],
      }),
    );
  },
  storyUxR1AdminHeaders: async ({ storyUxR1Context }, use) => {
    await use(
      createStoryUxR1Headers(storyUxR1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyUxR1Context.adminUserId,
        orgUnitMemberships: [storyUxR1Context.orgUnitId],
      }),
    );
  },
  storyUxR1InboxQuery: async ({ storyUxR1Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR1Context.tenantId,
      orgUnitId: storyUxR1Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyUxR1MineQuery: async ({ storyUxR1Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR1Context.tenantId,
      orgUnitId: storyUxR1Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
