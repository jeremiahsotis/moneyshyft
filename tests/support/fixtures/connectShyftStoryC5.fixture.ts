import { test as base } from '@playwright/test';
import {
  createStoryC5Context,
  createStoryC5Headers,
  type StoryC5Context,
} from '../factories/connectShyftStoryC5Factory';

type StoryC5Fixtures = {
  storyC5Context: StoryC5Context;
  storyC5SchedulerHeaders: Record<string, string>;
  storyC5ClaimHeaders: Record<string, string>;
  storyC5SchedulerRunPayload: {
    tenantId: string;
    orgUnitId: string;
    asOfUtc: string;
    limit: number;
  };
  storyC5ClaimPayload: {
    orgUnitId: string;
  };
  storyC5ValidBaselinePayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
  };
  storyC5InvalidBaselinePayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
  };
};

export const test = base.extend<StoryC5Fixtures>({
  storyC5Context: async ({}, use) => {
    await use(createStoryC5Context());
  },
  storyC5SchedulerHeaders: async ({ storyC5Context }, use) => {
    await use(
      createStoryC5Headers(storyC5Context, {
        role: 'TENANT_STAFF',
        userId: storyC5Context.schedulerUserId,
      }),
    );
  },
  storyC5ClaimHeaders: async ({ storyC5Context }, use) => {
    await use(
      createStoryC5Headers(storyC5Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyC5Context.orgUnitId],
      }),
    );
  },
  storyC5SchedulerRunPayload: async ({ storyC5Context }, use) => {
    await use({
      tenantId: storyC5Context.tenantId,
      orgUnitId: storyC5Context.orgUnitId,
      asOfUtc: '2026-03-01T00:00:00Z',
      limit: 50,
    });
  },
  storyC5ClaimPayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
    });
  },
  storyC5ValidBaselinePayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
      escalationBaselineHours: storyC5Context.escalationBaselineHours.valid,
    });
  },
  storyC5InvalidBaselinePayload: async ({ storyC5Context }, use) => {
    await use({
      orgUnitId: storyC5Context.orgUnitId,
      escalationBaselineHours: storyC5Context.escalationBaselineHours.invalidFractional,
    });
  },
});

export { expect } from '@playwright/test';
