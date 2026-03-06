import { test as base } from '@playwright/test';
import {
  createStoryA5Context,
  createStoryA5Headers,
  type StoryA5Context,
} from '../factories/connectShyftStoryA5Factory';

type StoryA5Fixtures = {
  storyA5Context: StoryA5Context;
  storyA5OrgUnitAdminHeaders: Record<string, string>;
  storyA5OrgUnitMemberHeaders: Record<string, string>;
  storyA5TenantViewerHeaders: Record<string, string>;
  storyA5TenantStaffHeaders: Record<string, string>;
  storyA5ValidNumberCreatePayload: {
    orgUnitId: string;
    twilioNumberE164: string;
    label: string;
    isActive: boolean;
  };
  storyA5ValidEscalationPayload: {
    orgUnitId: string;
    escalationBaselineHours: number;
    recipients: {
      primaryOrgUnitAdminUserId: string;
      secondaryOrgUnitAdminUserId: string;
      tenantStaffUserId: string;
    };
  };
};

export const test = base.extend<StoryA5Fixtures>({
  storyA5Context: async ({}, use) => {
    await use(createStoryA5Context());
  },
  storyA5OrgUnitAdminHeaders: async ({ storyA5Context }, use) => {
    await use(
      createStoryA5Headers(storyA5Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyA5Context.orgUnitAdminUserId,
        orgUnitMemberships: [storyA5Context.orgUnitId],
      }),
    );
  },
  storyA5OrgUnitMemberHeaders: async ({ storyA5Context }, use) => {
    await use(
      createStoryA5Headers(storyA5Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyA5Context.orgUnitMemberUserId,
        orgUnitMemberships: [storyA5Context.orgUnitId],
      }),
    );
  },
  storyA5TenantViewerHeaders: async ({ storyA5Context }, use) => {
    await use(
      createStoryA5Headers(storyA5Context, {
        role: 'TENANT_VIEWER',
        userId: storyA5Context.tenantViewerUserId,
      }),
    );
  },
  storyA5TenantStaffHeaders: async ({ storyA5Context }, use) => {
    await use(
      createStoryA5Headers(storyA5Context, {
        role: 'TENANT_STAFF',
        userId: storyA5Context.tenantStaffUserId,
      }),
    );
  },
  storyA5ValidNumberCreatePayload: async ({ storyA5Context }, use) => {
    await use({
      orgUnitId: storyA5Context.orgUnitId,
      twilioNumberE164: storyA5Context.validPrimaryNumber,
      label: 'A5 Primary Dispatch',
      isActive: true,
    });
  },
  storyA5ValidEscalationPayload: async ({ storyA5Context }, use) => {
    await use({
      orgUnitId: storyA5Context.orgUnitId,
      escalationBaselineHours: storyA5Context.validEscalationBaselineHours,
      recipients: {
        primaryOrgUnitAdminUserId: storyA5Context.orgUnitAdminUserId,
        secondaryOrgUnitAdminUserId: storyA5Context.orgUnitMemberUserId,
        tenantStaffUserId: storyA5Context.tenantStaffUserId,
      },
    });
  },
});

export { expect } from '@playwright/test';
