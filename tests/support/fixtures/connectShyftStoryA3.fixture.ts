import { test as base } from '@playwright/test';
import {
  createStoryA3Context,
  createStoryA3Headers,
  type StoryA3Context,
} from '../factories/connectShyftStoryA3Factory';

type StoryA3Fixtures = {
  storyA3Context: StoryA3Context;
  storyA3AdminHeaders: Record<string, string>;
  storyA3TenantStaffHeaders: Record<string, string>;
  storyA3CreatePrimaryPayload: {
    orgUnitId: string;
    twilioNumberE164: string;
    label: string;
    isActive: boolean;
  };
  storyA3CreateSecondaryPayload: {
    orgUnitId: string;
    twilioNumberE164: string;
    label: string;
    isActive: boolean;
  };
  storyA3InvalidNumberPayload: {
    orgUnitId: string;
    twilioNumberE164: string;
    label: string;
    isActive: boolean;
  };
};

export const test = base.extend<StoryA3Fixtures>({
  storyA3Context: async ({}, use) => {
    await use(createStoryA3Context());
  },
  storyA3AdminHeaders: async ({ storyA3Context }, use) => {
    await use(
      createStoryA3Headers(storyA3Context, {
        orgUnitMemberships: [storyA3Context.orgUnitId],
      }),
    );
  },
  storyA3TenantStaffHeaders: async ({ storyA3Context }, use) => {
    await use(
      createStoryA3Headers(storyA3Context, {
        role: 'TENANT_STAFF',
      }),
    );
  },
  storyA3CreatePrimaryPayload: async ({ storyA3Context }, use) => {
    await use({
      orgUnitId: storyA3Context.orgUnitId,
      twilioNumberE164: storyA3Context.validPrimaryNumber,
      label: 'Primary Dispatch',
      isActive: true,
    });
  },
  storyA3CreateSecondaryPayload: async ({ storyA3Context }, use) => {
    await use({
      orgUnitId: storyA3Context.orgUnitId,
      twilioNumberE164: storyA3Context.validSecondaryNumber,
      label: 'Overflow Dispatch',
      isActive: true,
    });
  },
  storyA3InvalidNumberPayload: async ({ storyA3Context }, use) => {
    await use({
      orgUnitId: storyA3Context.orgUnitId,
      twilioNumberE164: storyA3Context.invalidNonE164Number,
      label: 'Invalid Mapping',
      isActive: true,
    });
  },
});

export { expect } from '@playwright/test';
