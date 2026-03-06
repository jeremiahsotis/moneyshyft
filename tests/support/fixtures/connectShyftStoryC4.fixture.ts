import { test as base } from '@playwright/test';
import {
  createStoryC4Context,
  createStoryC4Headers,
  type StoryC4Context,
} from '../factories/connectShyftStoryC4Factory';

type StoryC4Fixtures = {
  storyC4Context: StoryC4Context;
  storyC4MemberHeaders: Record<string, string>;
  storyC4AdminHeaders: Record<string, string>;
  storyC4ViewerHeaders: Record<string, string>;
  storyC4ClaimPayload: {
    orgUnitId: string;
  };
  storyC4TakeoverPayload: {
    orgUnitId: string;
    reason: string;
  };
  storyC4ClosePayload: {
    orgUnitId: string;
    resolution: string;
  };
  storyC4OutboundMessagePayload: {
    channel: 'sms';
    body: string;
  };
  storyC4InboundVoicePayload: {
    eventType: 'voice.voicemail';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
  };
};

export const test = base.extend<StoryC4Fixtures>({
  storyC4Context: async ({}, use) => {
    await use(createStoryC4Context());
  },
  storyC4MemberHeaders: async ({ storyC4Context }, use) => {
    await use(
      createStoryC4Headers(storyC4Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyC4Context.orgUnitId],
      }),
    );
  },
  storyC4AdminHeaders: async ({ storyC4Context }, use) => {
    await use(
      createStoryC4Headers(storyC4Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyC4Context.adminUserId,
        orgUnitMemberships: [storyC4Context.orgUnitId],
      }),
    );
  },
  storyC4ViewerHeaders: async ({ storyC4Context }, use) => {
    await use(
      createStoryC4Headers(storyC4Context, {
        role: 'TENANT_VIEWER',
        userId: storyC4Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyC4ClaimPayload: async ({ storyC4Context }, use) => {
    await use({
      orgUnitId: storyC4Context.orgUnitId,
    });
  },
  storyC4TakeoverPayload: async ({ storyC4Context }, use) => {
    await use({
      orgUnitId: storyC4Context.orgUnitId,
      reason: 'shift-change',
    });
  },
  storyC4ClosePayload: async ({ storyC4Context }, use) => {
    await use({
      orgUnitId: storyC4Context.orgUnitId,
      resolution: 'handoff-complete',
    });
  },
  storyC4OutboundMessagePayload: async ({}, use) => {
    await use({
      channel: 'sms',
      body: 'Following up with a closure summary.',
    });
  },
  storyC4InboundVoicePayload: async ({ storyC4Context }, use) => {
    await use({
      eventType: 'voice.voicemail',
      threadId: storyC4Context.threadIds.closed,
      orgUnitId: storyC4Context.orgUnitId,
      tenantId: storyC4Context.tenantId,
    });
  },
});

export { expect } from '@playwright/test';
