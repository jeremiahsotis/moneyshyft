import { test as base } from '@playwright/test';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../utils/deterministicTestIds';
import {
  createStoryG6Context,
  createStoryG6Headers,
  type StoryG6Context,
} from '../factories/connectShyftStoryG6Factory';

type StoryG6Fixtures = {
  storyG6Context: StoryG6Context;
  storyG6VolunteerHeaders: Record<string, string>;
  storyG6AdminHeaders: Record<string, string>;
  storyG6ViewerHeaders: Record<string, string>;
  storyG6InboxQuery: string;
  storyG6MineQuery: string;
  storyG6OutboundCallPayload: {
    orgUnitId: string;
  };
  storyG6InboundClosedPayload: Record<string, unknown>;
};

export const test = base.extend<StoryG6Fixtures>({
  storyG6Context: async ({}, use, testInfo) => {
    await use(
      createStoryG6Context({
        correlationId: `corr-story-g6-${deterministicToken(testInfo, 'g6-fixture-correlation')}`,
        csrfToken: `csrf-story-g6-${deterministicToken(testInfo, 'g6-fixture-csrf')}`,
      }),
    );
  },
  storyG6VolunteerHeaders: async ({ storyG6Context }, use) => {
    await use(
      createStoryG6Headers(storyG6Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG6Context.userId,
        orgUnitMemberships: [storyG6Context.orgUnitId],
      }),
    );
  },
  storyG6AdminHeaders: async ({ storyG6Context }, use) => {
    await use(
      createStoryG6Headers(storyG6Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG6Context.adminUserId,
        orgUnitMemberships: [storyG6Context.orgUnitId],
      }),
    );
  },
  storyG6ViewerHeaders: async ({ storyG6Context }, use) => {
    await use(
      createStoryG6Headers(storyG6Context, {
        role: 'TENANT_VIEWER',
        userId: storyG6Context.viewerUserId,
        orgUnitId: null,
        orgUnitMemberships: [],
      }),
    );
  },
  storyG6InboxQuery: async ({ storyG6Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG6Context.tenantId,
      orgUnitId: storyG6Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyG6MineQuery: async ({ storyG6Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG6Context.tenantId,
      orgUnitId: storyG6Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
  storyG6OutboundCallPayload: async ({ storyG6Context }, use) => {
    await use({
      orgUnitId: storyG6Context.orgUnitId,
    });
  },
  storyG6InboundClosedPayload: async ({ storyG6Context }, use, testInfo) => {
    await use({
      provider: 'telnyx',
      providerEventId: deterministicProviderEventId(
        'provider-event-g6-atdd',
        testInfo,
        'g6-closed-inbound',
      ),
      providerLegId: `leg-g6-atdd-${deterministicToken(testInfo, 'g6-closed-inbound-leg')}`,
      eventType: storyG6Context.events.inboundMissedCall,
      tenantId: storyG6Context.tenantId,
      orgUnitId: storyG6Context.orgUnitId,
      threadId: storyG6Context.threadIds.closedInbound,
      neighborId: storyG6Context.neighborIds.closedInbound,
      payload: {
        missedCall: true,
      },
    });
  },
});

export { expect } from '@playwright/test';
