import { test as base } from '@playwright/test';
import {
  createStoryE4Context,
  createStoryE4Headers,
  type StoryE4Context,
} from '../factories/connectShyftStoryE4Factory';

type StoryE4Fixtures = {
  storyE4Context: StoryE4Context;
  storyE4OperatorHeaders: Record<string, string>;
  storyE4AdminHeaders: Record<string, string>;
  storyE4NumberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
  storyE4EnsurePayload: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
};

export const test = base.extend<StoryE4Fixtures>({
  storyE4Context: async ({}, use) => {
    await use(createStoryE4Context());
  },
  storyE4OperatorHeaders: async ({ storyE4Context }, use) => {
    await use(
      createStoryE4Headers(storyE4Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyE4Context.orgUnitId],
      }),
    );
  },
  storyE4AdminHeaders: async ({ storyE4Context }, use) => {
    await use(
      createStoryE4Headers(storyE4Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE4Context.adminUserId,
        orgUnitMemberships: [storyE4Context.orgUnitId],
      }),
    );
  },
  storyE4NumberMappingPayload: async ({ storyE4Context }, use) => {
    await use({
      orgUnitId: storyE4Context.orgUnitId,
      providerNumberE164: storyE4Context.numbers.mappedInbound,
      label: 'Story e.4 transcription callback mapped number',
      isActive: true,
    });
  },
  storyE4EnsurePayload: async ({ storyE4Context }, use) => {
    await use({
      orgUnitId: storyE4Context.orgUnitId,
      neighborId: storyE4Context.neighborIds.transcriptionTarget,
      source: 'VOICE',
      lastInboundCsNumberId: storyE4Context.numbers.mappedInbound,
      preferredOutboundCsNumberId: storyE4Context.numbers.mappedInbound,
    });
  },
});

export { expect } from '@playwright/test';
