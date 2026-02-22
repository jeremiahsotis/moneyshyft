import { test as base } from '@playwright/test';
import {
  createStoryA2Context,
  createStoryA2Headers,
  type StoryA2Context,
} from '../factories/connectShyftStoryA2Factory';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';

type StoryA2Fixtures = {
  storyA2Context: StoryA2Context;
  storyA2MemberHeaders: Record<string, string>;
  storyA2MissingOrgUnitHeaders: Record<string, string>;
  storyA2InvalidOrgUnitHeaders: Record<string, string>;
  storyA2NonMemberHeaders: Record<string, string>;
  storyA2TenantAdminHeaders: Record<string, string>;
  storyA2InvalidOrgUnitThreadPayload: {
    orgUnitId: string;
    neighborId: string;
  };
  storyA2CrossTenantThreadPayload: {
    orgUnitId: string;
    neighborId: string;
  };
};

export const test = base.extend<StoryA2Fixtures>({
  storyA2Context: async ({}, use) => {
    await use(createStoryA2Context());
  },
  storyA2MemberHeaders: async ({ storyA2Context }, use) => {
    await use(createStoryA2Headers(storyA2Context));
  },
  storyA2MissingOrgUnitHeaders: async ({ storyA2Context }, use) => {
    await use(
      createStoryA2Headers(storyA2Context, {
        orgUnitId: null,
        role: 'TENANT_STAFF',
        userId: connectShyftContextEnforcementData.staffUserId,
      }),
    );
  },
  storyA2InvalidOrgUnitHeaders: async ({ storyA2Context }, use) => {
    await use(
      createStoryA2Headers(storyA2Context, {
        orgUnitId: 'invalid-orgunit-context',
        role: 'TENANT_STAFF',
        userId: connectShyftContextEnforcementData.staffUserId,
      }),
    );
  },
  storyA2NonMemberHeaders: async ({ storyA2Context }, use) => {
    await use(
      createStoryA2Headers(storyA2Context, {
        orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
        role: 'ORGUNIT_MEMBER',
        userId: connectShyftContextEnforcementData.nonMemberUserId,
      }),
    );
  },
  storyA2TenantAdminHeaders: async ({ storyA2Context }, use) => {
    await use(
      createStoryA2Headers(storyA2Context, {
        orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
        role: 'TENANT_ADMIN',
        userId: connectShyftContextEnforcementData.tenantAdminUserId,
      }),
    );
  },
  storyA2InvalidOrgUnitThreadPayload: async ({}, use) => {
    await use({
      orgUnitId: 'invalid-orgunit-context',
      neighborId: 'neighbor-a2-invalid-orgunit',
    });
  },
  storyA2CrossTenantThreadPayload: async ({ storyA2Context }, use) => {
    await use({
      orgUnitId: storyA2Context.crossTenantOrgUnitId,
      neighborId: 'neighbor-a2-cross-tenant-orgunit',
    });
  },
});

export { expect } from '@playwright/test';
