import { test as base } from '@playwright/test';
import {
  createStoryB1Context,
  createStoryB1Headers,
  type StoryB1Context,
  type StoryB1NeighborCreatePayload,
} from '../factories/connectShyftStoryB1Factory';

type StoryB1Fixtures = {
  storyB1Context: StoryB1Context;
  storyB1AuthorizedHeaders: Record<string, string>;
  storyB1TenantViewerHeaders: Record<string, string>;
  storyB1ValidPayload: StoryB1NeighborCreatePayload;
  storyB1NoPhonePayload: StoryB1NeighborCreatePayload;
  storyB1InvalidPhonePayload: StoryB1NeighborCreatePayload;
  storyB1CrossTenantPayload: StoryB1NeighborCreatePayload;
};

export const test = base.extend<StoryB1Fixtures>({
  storyB1Context: async ({}, use) => {
    await use(createStoryB1Context());
  },
  storyB1AuthorizedHeaders: async ({ storyB1Context }, use) => {
    await use(
      createStoryB1Headers(storyB1Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyB1Context.orgUnitId],
      }),
    );
  },
  storyB1TenantViewerHeaders: async ({ storyB1Context }, use) => {
    await use(
      createStoryB1Headers(storyB1Context, {
        role: 'TENANT_VIEWER',
        userId: 'user-connectshyft-b1-tenant-viewer',
        orgUnitMemberships: [],
      }),
    );
  },
  storyB1ValidPayload: async ({ storyB1Context }, use) => {
    await use({
      orgUnitId: storyB1Context.orgUnitId,
      firstName: 'Mina',
      lastName: 'Lopez',
      phones: [
        {
          label: 'mobile',
          value: storyB1Context.validPhoneRaw,
        },
      ],
    });
  },
  storyB1NoPhonePayload: async ({ storyB1Context }, use) => {
    await use({
      orgUnitId: storyB1Context.orgUnitId,
      firstName: 'Noah',
      lastName: 'Harper',
      phones: [],
    });
  },
  storyB1InvalidPhonePayload: async ({ storyB1Context }, use) => {
    await use({
      orgUnitId: storyB1Context.orgUnitId,
      firstName: 'Ari',
      lastName: 'Quinn',
      phones: [
        {
          label: 'mobile',
          value: storyB1Context.invalidPhoneRaw,
        },
      ],
    });
  },
  storyB1CrossTenantPayload: async ({ storyB1Context }, use) => {
    await use({
      orgUnitId: storyB1Context.crossTenantOrgUnitId,
      firstName: 'Jules',
      lastName: 'North',
      phones: [
        {
          label: 'mobile',
          value: storyB1Context.validPhoneRaw,
        },
      ],
    });
  },
});

export { expect } from '@playwright/test';

