import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';
import {
  createStoryF1Context,
  createStoryF1Headers,
  type StoryF1Context,
} from '../factories/connectShyftStoryF1Factory';

type StoryF1Fixtures = {
  storyF1Context: StoryF1Context;
  storyF1OperatorHeaders: Record<string, string>;
  storyF1AdminHeaders: Record<string, string>;
  storyF1EnabledProviderCallPayload: {
    orgUnitId: string;
    providerKey: string;
  };
  storyF1EnabledProviderMessagePayload: {
    orgUnitId: string;
    providerKey: string;
    channel: 'sms';
    body: string;
  };
  storyF1DisabledProviderCallPayload: {
    orgUnitId: string;
    providerKey: string;
  };
  storyF1MissingProviderMessagePayload: {
    orgUnitId: string;
    providerKey: string;
    channel: 'sms';
    body: string;
  };
  storyF1InboundWebhookPayload: {
    eventType: 'voice.connected';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
    providerKey: string;
    providerEventId: string;
    callStatus: 'CONNECTED';
  };
};

export const test = base.extend<StoryF1Fixtures>({
  storyF1Context: async ({}, use) => {
    await use(createStoryF1Context());
  },
  storyF1OperatorHeaders: async ({ storyF1Context }, use) => {
    await use(
      createStoryF1Headers(storyF1Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyF1Context.orgUnitId],
      }),
    );
  },
  storyF1AdminHeaders: async ({ storyF1Context }, use) => {
    await use(
      createStoryF1Headers(storyF1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyF1Context.adminUserId,
        orgUnitMemberships: [storyF1Context.orgUnitId],
      }),
    );
  },
  storyF1EnabledProviderCallPayload: async ({ storyF1Context }, use) => {
    await use({
      orgUnitId: storyF1Context.orgUnitId,
      providerKey: storyF1Context.providers.enabledPrimary,
    });
  },
  storyF1EnabledProviderMessagePayload: async ({ storyF1Context }, use) => {
    await use({
      orgUnitId: storyF1Context.orgUnitId,
      providerKey: storyF1Context.providers.enabledPrimary,
      channel: 'sms',
      body: 'Provider registry contract check for enabled deterministic dispatch.',
    });
  },
  storyF1DisabledProviderCallPayload: async ({ storyF1Context }, use) => {
    await use({
      orgUnitId: storyF1Context.orgUnitId,
      providerKey: storyF1Context.providers.disabled,
    });
  },
  storyF1MissingProviderMessagePayload: async ({ storyF1Context }, use) => {
    await use({
      orgUnitId: storyF1Context.orgUnitId,
      providerKey: storyF1Context.providers.missing,
      channel: 'sms',
      body: 'Expected deterministic refusal for unregistered provider.',
    });
  },
  storyF1InboundWebhookPayload: async ({ storyF1Context }, use) => {
    const eventToken = randomUUID().slice(0, 8);
    await use({
      eventType: 'voice.connected',
      threadId: storyF1Context.threadIds.unclaimed,
      orgUnitId: storyF1Context.orgUnitId,
      tenantId: storyF1Context.tenantId,
      providerKey: storyF1Context.providers.enabledPrimary,
      providerEventId: `telnyx-call-event-f1-${eventToken}`,
      callStatus: 'CONNECTED',
    });
  },
});

export { expect } from '@playwright/test';
