import { test as base } from '@playwright/test';
import {
  createStoryG2Context,
  createStoryG2Headers,
  type StoryG2Context,
} from '../factories/connectShyftStoryG2Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryG2Fixtures = {
  storyG2SmsSenderReady: void;
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
  storyG2SmsSenderReady: async ({ request, storyG2Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryG2Headers(storyG2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG2Context.adminUserId,
        orgUnitMemberships: [storyG2Context.orgUnitId],
      }),
      orgUnitId: storyG2Context.orgUnitId,
      preferredNumber: '+12605550194',
      preferredLabel: 'Story G2 SMS sender',
    });
    await use();
  },
  storyG2MemberHeaders: async ({ storyG2SmsSenderReady, storyG2Context }, use) => {
    await use(
      createStoryG2Headers(storyG2Context, {
        orgUnitMemberships: [storyG2Context.orgUnitId],
      }),
    );
  },
  storyG2AdminHeaders: async ({ storyG2SmsSenderReady, storyG2Context }, use) => {
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
