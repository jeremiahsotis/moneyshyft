import { test as base } from '@playwright/test';
import {
  createStoryB2Context,
  createStoryB2Headers,
  type StoryB2Context,
  type StoryB2NeighborUpdatePayload,
} from '../factories/connectShyftStoryB2Factory';

type StoryB2Fixtures = {
  storyB2Context: StoryB2Context;
  storyB2PrimaryHeaders: Record<string, string>;
  storyB2PeerOrgUnitHeaders: Record<string, string>;
  storyB2CrossTenantHeaders: Record<string, string>;
  storyB2IdentityUpdatePayload: StoryB2NeighborUpdatePayload;
  storyB2SharedIndicatorTogglePayload: StoryB2NeighborUpdatePayload;
};

export const test = base.extend<StoryB2Fixtures>({
  storyB2Context: async ({}, use) => {
    await use(createStoryB2Context());
  },
  storyB2PrimaryHeaders: async ({ storyB2Context }, use) => {
    await use(
      createStoryB2Headers(storyB2Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitId: storyB2Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB2Context.primaryOrgUnitId],
      }),
    );
  },
  storyB2PeerOrgUnitHeaders: async ({ storyB2Context }, use) => {
    await use(
      createStoryB2Headers(storyB2Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitId: storyB2Context.peerOrgUnitId,
        orgUnitMemberships: [storyB2Context.peerOrgUnitId],
      }),
    );
  },
  storyB2CrossTenantHeaders: async ({ storyB2Context }, use) => {
    await use(
      createStoryB2Headers(storyB2Context, {
        tenantId: storyB2Context.crossTenantId,
        orgUnitId: storyB2Context.crossTenantOrgUnitId,
        role: 'ORGUNIT_MEMBER',
        userId: 'user-connectshyft-b2-cross-tenant',
        orgUnitMemberships: [storyB2Context.crossTenantOrgUnitId],
      }),
    );
  },
  storyB2IdentityUpdatePayload: async ({ storyB2Context }, use) => {
    await use({
      orgUnitId: storyB2Context.primaryOrgUnitId,
      firstName: storyB2Context.updatedFirstName,
      lastName: storyB2Context.updatedLastName,
      phones: [
        {
          label: 'mobile',
          value: storyB2Context.sharedPhoneRaw,
          isShared: true,
          verificationStatus: 'verified',
        },
        {
          label: 'home',
          value: storyB2Context.nonSharedPhoneRaw,
          isShared: false,
          verificationStatus: 'unverified',
        },
      ],
    });
  },
  storyB2SharedIndicatorTogglePayload: async ({ storyB2Context }, use) => {
    await use({
      orgUnitId: storyB2Context.primaryOrgUnitId,
      firstName: storyB2Context.updatedFirstName,
      lastName: storyB2Context.updatedLastName,
      phones: [
        {
          label: 'mobile',
          value: storyB2Context.sharedPhoneRaw,
          isShared: false,
          verificationStatus: 'verified',
        },
        {
          label: 'home',
          value: storyB2Context.nonSharedPhoneRaw,
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    });
  },
});

export { expect } from '@playwright/test';
