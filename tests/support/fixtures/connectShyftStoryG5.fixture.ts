import { test as base } from '@playwright/test';
import {
  createStoryG5Context,
  createStoryG5Headers,
  type StoryG5Context,
} from '../factories/connectShyftStoryG5Factory';

type StoryG5Fixtures = {
  storyG5Context: StoryG5Context;
  storyG5VolunteerHeaders: Record<string, string>;
  storyG5AdminHeaders: Record<string, string>;
  storyG5ViewerHeaders: Record<string, string>;
};

export const test = base.extend<StoryG5Fixtures>({
  storyG5Context: async ({}, use) => {
    await use(createStoryG5Context());
  },
  storyG5VolunteerHeaders: async ({ storyG5Context }, use) => {
    await use(
      createStoryG5Headers(storyG5Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG5Context.volunteerUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }),
    );
  },
  storyG5AdminHeaders: async ({ storyG5Context }, use) => {
    await use(
      createStoryG5Headers(storyG5Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG5Context.orgUnitAdminUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }),
    );
  },
  storyG5ViewerHeaders: async ({ storyG5Context }, use) => {
    await use(
      createStoryG5Headers(storyG5Context, {
        role: 'TENANT_VIEWER',
        userId: storyG5Context.tenantViewerUserId,
        orgUnitId: null,
        orgUnitMemberships: [],
      }),
    );
  },
});

export { expect } from '@playwright/test';
