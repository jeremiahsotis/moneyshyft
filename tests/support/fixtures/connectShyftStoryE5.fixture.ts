import { test as base } from '@playwright/test';
import {
  createStoryE5Context,
  createStoryE5Headers,
  type StoryE5Context,
} from '../factories/connectShyftStoryE5Factory';

type StoryE5Fixtures = {
  storyE5Context: StoryE5Context;
  storyE5OperatorHeaders: Record<string, string>;
  storyE5AdminHeaders: Record<string, string>;
  storyE5NumberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
  storyE5CleanupRequestPayload: {
    policyWindowDays: number;
    dryRun: false;
  };
};

export const test = base.extend<StoryE5Fixtures>({
  storyE5Context: async ({}, use) => {
    await use(createStoryE5Context());
  },
  storyE5OperatorHeaders: async ({ storyE5Context }, use) => {
    await use(
      createStoryE5Headers(storyE5Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyE5Context.orgUnitId],
      }),
    );
  },
  storyE5AdminHeaders: async ({ storyE5Context }, use) => {
    await use(
      createStoryE5Headers(storyE5Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE5Context.adminUserId,
        orgUnitMemberships: [storyE5Context.orgUnitId],
      }),
    );
  },
  storyE5NumberMappingPayload: async ({ storyE5Context }, use) => {
    await use({
      orgUnitId: storyE5Context.orgUnitId,
      providerNumberE164: storyE5Context.numbers.mappedInbound,
      label: 'Story e.5 receipt-ledger mapped inbound webhook number',
      isActive: true,
    });
  },
  storyE5CleanupRequestPayload: async ({ storyE5Context }, use) => {
    await use({
      policyWindowDays: storyE5Context.receiptPolicyDays,
      dryRun: false,
    });
  },
});

export { expect } from '@playwright/test';
