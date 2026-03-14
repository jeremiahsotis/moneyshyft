import { test as base } from '@playwright/test';
import {
  createStoryA4Context,
  createStoryA4Headers,
  type StoryA4Context,
} from '../factories/connectShyftStoryA4Factory';

type StoryA4Fixtures = {
  storyA4Context: StoryA4Context;
  storyA4AdminHeaders: Record<string, string>;
  storyA4TenantStaffHeaders: Record<string, string>;
  storyA4ValidConfigPayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: {
      primaryOrgUnitAdminUserId: string;
      secondaryOrgUnitAdminUserId: string;
      tenantStaffUserId: string;
    };
  };
  storyA4InvalidRangePayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: {
      primaryOrgUnitAdminUserId: string;
      secondaryOrgUnitAdminUserId: string;
      tenantStaffUserId: string;
    };
  };
};

export const test = base.extend<StoryA4Fixtures>({
  storyA4Context: async ({}, use) => {
    await use(createStoryA4Context());
  },
  storyA4AdminHeaders: async ({ storyA4Context }, use) => {
    await use(
      createStoryA4Headers(storyA4Context, {
        orgUnitMemberships: [storyA4Context.orgUnitId],
      }),
    );
  },
  storyA4TenantStaffHeaders: async ({ storyA4Context }, use) => {
    await use(
      createStoryA4Headers(storyA4Context, {
        role: 'TENANT_STAFF',
      }),
    );
  },
  storyA4ValidConfigPayload: async ({ storyA4Context }, use) => {
    await use({
      orgUnitId: storyA4Context.orgUnitId,
      escalationBaselineHours: storyA4Context.validBaselineHours,
      recipients: {
        ...storyA4Context.recipients,
      },
    });
  },
  storyA4InvalidRangePayload: async ({ storyA4Context }, use) => {
    await use({
      orgUnitId: storyA4Context.orgUnitId,
      escalationBaselineHours: storyA4Context.invalidBaselineHigh,
      recipients: {
        ...storyA4Context.recipients,
      },
    });
  },
});

export { expect } from '@playwright/test';
