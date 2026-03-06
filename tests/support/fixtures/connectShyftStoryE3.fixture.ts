import { test as base } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
  type StoryE3Context,
} from '../factories/connectShyftStoryE3Factory';

type StoryE3Fixtures = {
  storyE3Context: StoryE3Context;
  storyE3OperatorHeaders: Record<string, string>;
  storyE3AdminHeaders: Record<string, string>;
  storyE3NumberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
  storyE3EnsurePayloadUnclaimed: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
  storyE3EnsurePayloadClaimed: {
    orgUnitId: string;
    neighborId: string;
    source: 'VOICE';
    lastInboundCsNumberId: string;
    preferredOutboundCsNumberId: string;
  };
};

export const test = base.extend<StoryE3Fixtures>({
  storyE3Context: async ({}, use) => {
    await use(createStoryE3Context());
  },
  storyE3OperatorHeaders: async ({ storyE3Context }, use) => {
    await use(
      createStoryE3Headers(storyE3Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyE3Context.orgUnitId],
      }),
    );
  },
  storyE3AdminHeaders: async ({ storyE3Context }, use) => {
    await use(
      createStoryE3Headers(storyE3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE3Context.adminUserId,
        orgUnitMemberships: [storyE3Context.orgUnitId],
      }),
    );
  },
  storyE3NumberMappingPayload: async ({ storyE3Context }, use) => {
    await use({
      orgUnitId: storyE3Context.orgUnitId,
      providerNumberE164: storyE3Context.numbers.mappedInbound,
      label: 'Story e.3 inbound voice mapped number',
      isActive: true,
    });
  },
  storyE3EnsurePayloadUnclaimed: async ({ storyE3Context }, use) => {
    await use({
      orgUnitId: storyE3Context.orgUnitId,
      neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-e3-001',
      preferredOutboundCsNumberId: 'cs-outbound-e3-001',
    });
  },
  storyE3EnsurePayloadClaimed: async ({ storyE3Context }, use) => {
    await use({
      orgUnitId: storyE3Context.orgUnitId,
      neighborId: storyE3Context.neighborIds.voicemailClaimed,
      source: 'VOICE',
      lastInboundCsNumberId: 'cs-inbound-e3-002',
      preferredOutboundCsNumberId: 'cs-outbound-e3-002',
    });
  },
});

export { expect } from '@playwright/test';
