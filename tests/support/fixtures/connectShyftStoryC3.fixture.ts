import { test as base } from '@playwright/test';
import {
  createStoryC3Context,
  createStoryC3Headers,
  type StoryC3Context,
} from '../factories/connectShyftStoryC3Factory';

type StoryC3Fixtures = {
  storyC3Context: StoryC3Context;
  storyC3MemberHeaders: Record<string, string>;
  storyC3AdminHeaders: Record<string, string>;
  storyC3InboxQuery: string;
  storyC3MineQuery: string;
};

export const test = base.extend<StoryC3Fixtures>({
  storyC3Context: async ({}, use) => {
    await use(createStoryC3Context());
  },
  storyC3MemberHeaders: async ({ storyC3Context }, use) => {
    await use(
      createStoryC3Headers(storyC3Context, {
        orgUnitMemberships: [storyC3Context.orgUnitId],
      }),
    );
  },
  storyC3AdminHeaders: async ({ storyC3Context }, use) => {
    await use(
      createStoryC3Headers(storyC3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: 'user-connectshyft-c3-admin',
        orgUnitMemberships: [storyC3Context.orgUnitId],
      }),
    );
  },
  storyC3InboxQuery: async ({ storyC3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyC3Context.tenantId,
      orgUnitId: storyC3Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyC3MineQuery: async ({ storyC3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyC3Context.tenantId,
      orgUnitId: storyC3Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
