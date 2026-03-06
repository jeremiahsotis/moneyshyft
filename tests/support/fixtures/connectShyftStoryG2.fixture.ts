import { test as base } from '@playwright/test';
import {
  createStoryG2Context,
  createStoryG2Headers,
  type StoryG2Context,
} from '../factories/connectShyftStoryG2Factory';

type StoryG2Fixtures = {
  storyG2Context: StoryG2Context;
  storyG2MemberHeaders: Record<string, string>;
  storyG2AdminHeaders: Record<string, string>;
  storyG2InboxQuery: string;
  storyG2MineQuery: string;
};

export const test = base.extend<StoryG2Fixtures>({
  storyG2Context: async ({}, use) => {
    await use(createStoryG2Context());
  },
  storyG2MemberHeaders: async ({ storyG2Context }, use) => {
    await use(
      createStoryG2Headers(storyG2Context, {
        orgUnitMemberships: [storyG2Context.orgUnitId],
      }),
    );
  },
  storyG2AdminHeaders: async ({ storyG2Context }, use) => {
    await use(
      createStoryG2Headers(storyG2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG2Context.adminUserId,
        orgUnitMemberships: [storyG2Context.orgUnitId],
      }),
    );
  },
  storyG2InboxQuery: async ({ storyG2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG2Context.tenantId,
      orgUnitId: storyG2Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyG2MineQuery: async ({ storyG2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG2Context.tenantId,
      orgUnitId: storyG2Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
