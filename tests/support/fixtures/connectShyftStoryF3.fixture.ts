import { test as base } from '@playwright/test';
import {
  createStoryF3Context,
  createStoryF3Headers,
  type StoryF3Context,
} from '../factories/connectShyftStoryF3Factory';

type StoryF3Fixtures = {
  storyF3Context: StoryF3Context;
  storyF3OperatorHeaders: Record<string, string>;
  storyF3AdminHeaders: Record<string, string>;
  storyF3OutboundCallPayload: {
    orgUnitId: string;
    providerKey: string;
  };
  storyF3OutboundMessagePayload: {
    orgUnitId: string;
    providerKey: string;
    channel: 'sms';
    body: string;
  };
};

export const test = base.extend<StoryF3Fixtures>({
  storyF3Context: async ({}, use) => {
    await use(createStoryF3Context());
  },
  storyF3OperatorHeaders: async ({ storyF3Context }, use) => {
    await use(
      createStoryF3Headers(storyF3Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyF3Context.orgUnitId],
      }),
    );
  },
  storyF3AdminHeaders: async ({ storyF3Context }, use) => {
    await use(
      createStoryF3Headers(storyF3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyF3Context.adminUserId,
        orgUnitMemberships: [storyF3Context.orgUnitId],
      }),
    );
  },
  storyF3OutboundCallPayload: async ({ storyF3Context }, use) => {
    await use({
      orgUnitId: storyF3Context.orgUnitId,
      providerKey: storyF3Context.providers.enabledPrimary,
    });
  },
  storyF3OutboundMessagePayload: async ({ storyF3Context }, use) => {
    await use({
      orgUnitId: storyF3Context.orgUnitId,
      providerKey: storyF3Context.providers.enabledPrimary,
      channel: 'sms',
      body: 'Story f.3 provider correlation fallback mapping coverage message.',
    });
  },
});

export { expect } from '@playwright/test';
