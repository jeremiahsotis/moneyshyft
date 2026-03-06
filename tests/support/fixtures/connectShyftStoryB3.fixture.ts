import { test as base } from '@playwright/test';
import {
  createStoryB3Context,
  createStoryB3Headers,
  type StoryB3Context,
  type StoryB3NeighborUpdatePayload,
} from '../factories/connectShyftStoryB3Factory';

type StoryB3Fixtures = {
  storyB3Context: StoryB3Context;
  storyB3RelatedActorHeaders: Record<string, string>;
  storyB3TenantPrivilegedHeaders: Record<string, string>;
  storyB3UnrelatedActorHeaders: Record<string, string>;
  storyB3RelatedUpdatePayload: StoryB3NeighborUpdatePayload;
  storyB3TenantPrivilegedUpdatePayload: StoryB3NeighborUpdatePayload;
};

export const test = base.extend<StoryB3Fixtures>({
  storyB3Context: async ({}, use) => {
    await use(createStoryB3Context());
  },
  storyB3RelatedActorHeaders: async ({ storyB3Context }, use) => {
    await use(
      createStoryB3Headers(storyB3Context, {
        role: 'ORGUNIT_IDENTITY_LEAD',
        userId: storyB3Context.relatedActorUserId,
        orgUnitId: storyB3Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB3Context.primaryOrgUnitId],
        activeThreadNeighborIds: [storyB3Context.neighborId],
      }),
    );
  },
  storyB3TenantPrivilegedHeaders: async ({ storyB3Context }, use) => {
    await use(
      createStoryB3Headers(storyB3Context, {
        role: 'TENANT_STAFF',
        userId: storyB3Context.tenantPrivilegedUserId,
        orgUnitId: storyB3Context.peerOrgUnitId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyB3UnrelatedActorHeaders: async ({ storyB3Context }, use) => {
    await use(
      createStoryB3Headers(storyB3Context, {
        role: 'ORGUNIT_IDENTITY_LEAD',
        userId: storyB3Context.unrelatedActorUserId,
        orgUnitId: storyB3Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB3Context.primaryOrgUnitId],
        activeThreadNeighborIds: [],
      }),
    );
  },
  storyB3RelatedUpdatePayload: async ({ storyB3Context }, use) => {
    await use({
      orgUnitId: storyB3Context.primaryOrgUnitId,
      firstName: storyB3Context.relatedUpdateFirstName,
      lastName: storyB3Context.relatedUpdateLastName,
      phones: [
        {
          label: 'mobile',
          value: storyB3Context.sharedPhoneRaw,
          isShared: true,
          verificationStatus: 'verified',
        },
        {
          label: 'home',
          value: storyB3Context.nonSharedPhoneRaw,
          isShared: false,
          verificationStatus: 'unverified',
        },
      ],
    });
  },
  storyB3TenantPrivilegedUpdatePayload: async ({ storyB3Context }, use) => {
    await use({
      orgUnitId: storyB3Context.peerOrgUnitId,
      firstName: storyB3Context.tenantPrivilegedUpdateFirstName,
      lastName: storyB3Context.tenantPrivilegedUpdateLastName,
      phones: [
        {
          label: 'mobile',
          value: storyB3Context.sharedPhoneRaw,
          isShared: false,
          verificationStatus: 'verified',
        },
        {
          label: 'home',
          value: storyB3Context.nonSharedPhoneRaw,
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    });
  },
});

export { expect } from '@playwright/test';
