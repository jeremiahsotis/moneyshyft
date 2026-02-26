import { test as base } from '@playwright/test';
import {
  createStoryUxR2Context,
  createStoryUxR2Headers,
  type StoryUxR2Context,
} from '../factories/connectShyftStoryUxR2Factory';

type StoryUxR2Fixtures = {
  storyUxR2Context: StoryUxR2Context;
  storyUxR2MemberHeaders: Record<string, string>;
  storyUxR2AdminHeaders: Record<string, string>;
  storyUxR2InboxQuery: string;
  storyUxR2MineQuery: string;
  storyUxR2AddNeighborPayload: {
    orgUnitId: string;
    firstName: string;
    lastName: string;
    phone: string;
    preferredLanguage: string;
  };
  storyUxR2ClosePayload: {
    orgUnitId: string;
    resolution: string;
    outcomeMessage: string;
  };
};

export const test = base.extend<StoryUxR2Fixtures>({
  storyUxR2Context: async ({}, use) => {
    await use(createStoryUxR2Context());
  },
  storyUxR2MemberHeaders: async ({ storyUxR2Context }, use) => {
    await use(
      createStoryUxR2Headers(storyUxR2Context, {
        orgUnitMemberships: [storyUxR2Context.orgUnitId],
      }),
    );
  },
  storyUxR2AdminHeaders: async ({ storyUxR2Context }, use) => {
    await use(
      createStoryUxR2Headers(storyUxR2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyUxR2Context.adminUserId,
        orgUnitMemberships: [storyUxR2Context.orgUnitId],
      }),
    );
  },
  storyUxR2InboxQuery: async ({ storyUxR2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR2Context.tenantId,
      orgUnitId: storyUxR2Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyUxR2MineQuery: async ({ storyUxR2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR2Context.tenantId,
      orgUnitId: storyUxR2Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
  storyUxR2AddNeighborPayload: async ({ storyUxR2Context }, use) => {
    await use({
      orgUnitId: storyUxR2Context.orgUnitId,
      firstName: 'Ada',
      lastName: 'Neighbor',
      phone: '+15551234567',
      preferredLanguage: 'en',
    });
  },
  storyUxR2ClosePayload: async ({ storyUxR2Context }, use) => {
    await use({
      orgUnitId: storyUxR2Context.orgUnitId,
      resolution: 'handoff-complete',
      outcomeMessage: 'Closed with a clear operator summary.',
    });
  },
});

export { expect } from '@playwright/test';
