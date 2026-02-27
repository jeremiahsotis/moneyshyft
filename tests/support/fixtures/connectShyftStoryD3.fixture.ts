import { test as base } from '@playwright/test';
import {
  createStoryD3Context,
  createStoryD3Headers,
  type StoryD3Context,
} from '../factories/connectShyftStoryD3Factory';

type StoryD3Fixtures = {
  storyD3Context: StoryD3Context;
  storyD3OperatorHeaders: Record<string, string>;
  storyD3AdminHeaders: Record<string, string>;
  storyD3ViewerHeaders: Record<string, string>;
  storyD3OutboundCallPayload: {
    orgUnitId: string;
  };
  storyD3OutboundMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyD3PolicyRefusalMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    override: {
      reasonCode: string;
      note: string;
    };
  };
  storyD3ClosePayload: {
    orgUnitId: string;
    resolution: string;
  };
  storyD3InboundFallbackPayload: {
    eventType: 'voice.fallback';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
  };
};

export const test = base.extend<StoryD3Fixtures>({
  storyD3Context: async ({}, use) => {
    await use(createStoryD3Context());
  },
  storyD3OperatorHeaders: async ({ storyD3Context }, use) => {
    await use(
      createStoryD3Headers(storyD3Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyD3Context.orgUnitId],
      }),
    );
  },
  storyD3AdminHeaders: async ({ storyD3Context }, use) => {
    await use(
      createStoryD3Headers(storyD3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD3Context.adminUserId,
        orgUnitMemberships: [storyD3Context.orgUnitId],
      }),
    );
  },
  storyD3ViewerHeaders: async ({ storyD3Context }, use) => {
    await use(
      createStoryD3Headers(storyD3Context, {
        role: 'TENANT_VIEWER',
        userId: storyD3Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyD3OutboundCallPayload: async ({ storyD3Context }, use) => {
    await use({
      orgUnitId: storyD3Context.orgUnitId,
    });
  },
  storyD3OutboundMessagePayload: async ({ storyD3Context }, use) => {
    await use({
      orgUnitId: storyD3Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound compliance-traceable update for resident support.',
    });
  },
  storyD3PolicyRefusalMessagePayload: async ({ storyD3Context }, use) => {
    await use({
      orgUnitId: storyD3Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound attempt expected to refuse under policy.',
      override: {
        reasonCode: 'INVALID_POLICY_OVERRIDE',
        note: '',
      },
    });
  },
  storyD3ClosePayload: async ({ storyD3Context }, use) => {
    await use({
      orgUnitId: storyD3Context.orgUnitId,
      resolution: 'stabilized-and-closed',
    });
  },
  storyD3InboundFallbackPayload: async ({ storyD3Context }, use) => {
    await use({
      eventType: 'voice.fallback',
      threadId: storyD3Context.threadIds.closed,
      orgUnitId: storyD3Context.orgUnitId,
      tenantId: storyD3Context.tenantId,
    });
  },
});

export { expect } from '@playwright/test';
