import { test as base } from '@playwright/test';
import {
  createStoryE2Context,
  createStoryE2Headers,
  type StoryE2Context,
} from '../factories/connectShyftStoryE2Factory';

type StoryE2Fixtures = {
  storyE2Context: StoryE2Context;
  storyE2OperatorHeaders: Record<string, string>;
  storyE2AdminHeaders: Record<string, string>;
  storyE2NumberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
  storyE2EnsurePayload: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
};

export const test = base.extend<StoryE2Fixtures>({
  storyE2Context: async ({}, use) => {
    await use(createStoryE2Context());
  },
  storyE2OperatorHeaders: async ({ storyE2Context }, use) => {
    await use(
      createStoryE2Headers(storyE2Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyE2Context.orgUnitId],
      }),
    );
  },
  storyE2AdminHeaders: async ({ storyE2Context }, use) => {
    await use(
      createStoryE2Headers(storyE2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE2Context.adminUserId,
        orgUnitMemberships: [storyE2Context.orgUnitId],
      }),
    );
  },
  storyE2NumberMappingPayload: async ({ storyE2Context }, use) => {
    await use({
      orgUnitId: storyE2Context.orgUnitId,
      providerNumberE164: storyE2Context.numbers.mappedInbound,
      label: 'Story e.2 mapped inbound SMS number',
      isActive: true,
    });
  },
  storyE2EnsurePayload: async ({ storyE2Context }, use) => {
    await use({
      orgUnitId: storyE2Context.orgUnitId,
      neighborId: storyE2Context.neighborIds.existingActive,
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-e2-001',
      preferredOutboundCsNumberId: 'cs-outbound-e2-001',
    });
  },
});

export { expect } from '@playwright/test';
