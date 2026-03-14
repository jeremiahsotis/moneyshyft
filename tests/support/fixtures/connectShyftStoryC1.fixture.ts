import { test as base } from '@playwright/test';
import {
  createStoryC1Context,
  createStoryC1Headers,
  type StoryC1Context,
} from '../factories/connectShyftStoryC1Factory';

type StoryC1Fixtures = {
  storyC1Context: StoryC1Context;
  storyC1OperatorHeaders: Record<string, string>;
  storyC1SchedulerHeaders: Record<string, string>;
  storyC1CreatePayload: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
  storyC1DuplicatePayload: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
  storyC1InvalidStatePayload: {
    orgUnitId: string;
    neighborId: string;
    forcedState: 'PAUSED';
    source: 'VOICE';
  };
  storyC1DueQuery: string;
};

export const test = base.extend<StoryC1Fixtures>({
  storyC1Context: async ({}, use) => {
    await use(createStoryC1Context());
  },
  storyC1OperatorHeaders: async ({ storyC1Context }, use) => {
    await use(
      createStoryC1Headers(storyC1Context, {
        orgUnitMemberships: [storyC1Context.orgUnitId],
      }),
    );
  },
  storyC1SchedulerHeaders: async ({ storyC1Context }, use) => {
    await use(
      createStoryC1Headers(storyC1Context, {
        role: 'TENANT_STAFF',
      }),
    );
  },
  storyC1CreatePayload: async ({ storyC1Context }, use) => {
    await use({
      orgUnitId: storyC1Context.orgUnitId,
      neighborId: storyC1Context.neighborId,
      source: 'VOICE',
      lastInboundCsNumberId: storyC1Context.inboundCsNumberId,
      preferredOutboundCsNumberId: storyC1Context.preferredOutboundCsNumberId,
    });
  },
  storyC1DuplicatePayload: async ({ storyC1CreatePayload }, use) => {
    await use({ ...storyC1CreatePayload });
  },
  storyC1InvalidStatePayload: async ({ storyC1Context }, use) => {
    await use({
      orgUnitId: storyC1Context.orgUnitId,
      neighborId: storyC1Context.neighborId,
      forcedState: 'PAUSED',
      source: 'VOICE',
    });
  },
  storyC1DueQuery: async ({ storyC1Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyC1Context.tenantId,
      orgUnitId: storyC1Context.orgUnitId,
      limit: '50',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
