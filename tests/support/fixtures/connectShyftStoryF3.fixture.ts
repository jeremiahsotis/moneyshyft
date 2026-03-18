import { test as base } from '@playwright/test';
import {
  createStoryF3Context,
  createStoryF3Headers,
  type StoryF3Context,
} from '../factories/connectShyftStoryF3Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryF3Fixtures = {
  storyF3SmsSenderReady: void;
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
  storyF3SmsSenderReady: async ({ request, storyF3Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryF3Headers(storyF3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyF3Context.adminUserId,
        orgUnitMemberships: [storyF3Context.orgUnitId],
      }),
      orgUnitId: storyF3Context.orgUnitId,
      preferredNumber: '+12605550193',
      preferredLabel: 'Story F3 SMS sender',
    });
    await use();
  },
  storyF3OperatorHeaders: async ({ storyF3SmsSenderReady, storyF3Context }, use) => {
    await use(
      createStoryF3Headers(storyF3Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyF3Context.orgUnitId],
      }),
    );
  },
  storyF3AdminHeaders: async ({ storyF3SmsSenderReady, storyF3Context }, use) => {
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
