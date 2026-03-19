import { test as base } from '@playwright/test';
import {
  createStoryA1Context,
  createStoryA1FlagHeaders,
  storyA1FlagSets,
  type StoryA1Context,
} from '../factories/connectShyftStoryA1Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryA1Fixtures = {
  storyA1Context: StoryA1Context;
  storyA1WebhookSenderReady: void;
  storyA1FlagsOffHeaders: Record<string, string>;
  storyA1InboxOnlyHeaders: Record<string, string>;
  storyA1InboxAndEscalationHeaders: Record<string, string>;
  storyA1AllEnabledHeaders: Record<string, string>;
  storyA1InboxDisabledHeaders: Record<string, string>;
};

export const test = base.extend<StoryA1Fixtures>({
  storyA1Context: async ({}, use) => {
    await use(createStoryA1Context());
  },
  storyA1WebhookSenderReady: async ({ request, storyA1Context }, use) => {
    const headers = createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.allEnabled, {
      role: 'ORGUNIT_ADMIN',
    });
    headers['x-test-connectshyft-orgunit-memberships'] = JSON.stringify([
      storyA1Context.orgUnitId,
    ]);
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers,
      orgUnitId: storyA1Context.orgUnitId,
      preferredNumber: '+12605550999',
      preferredLabel: 'Story A1 inbound webhook sender',
    });
    await use();
  },
  storyA1FlagsOffHeaders: async ({ storyA1Context }, use) => {
    await use(createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.off));
  },
  storyA1InboxOnlyHeaders: async ({ storyA1Context }, use) => {
    await use(createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.inboxOnly));
  },
  storyA1InboxAndEscalationHeaders: async ({ storyA1Context }, use) => {
    await use(
      createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.inboxAndEscalation),
    );
  },
  storyA1AllEnabledHeaders: async ({ storyA1WebhookSenderReady, storyA1Context }, use) => {
    void storyA1WebhookSenderReady;
    await use(createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.allEnabled));
  },
  storyA1InboxDisabledHeaders: async ({ storyA1Context }, use) => {
    await use(
      createStoryA1FlagHeaders(storyA1Context, storyA1FlagSets.inboxDisabled),
    );
  },
});

export { expect } from '@playwright/test';
