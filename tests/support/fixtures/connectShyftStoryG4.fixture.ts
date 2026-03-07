import { test as base } from '@playwright/test';
import {
  createStoryG4Context,
  createStoryG4Headers,
  createStoryG4NeighborCreatePayload,
  createStoryG4ThreadEnsurePayload,
  type StoryG4Context,
  type StoryG4NeighborCreatePayload,
  type StoryG4ThreadEnsurePayload,
} from '../factories/connectShyftStoryG4Factory';

type StoryG4Fixtures = {
  storyG4Context: StoryG4Context;
  storyG4VolunteerHeaders: Record<string, string>;
  storyG4CrossScopeHeaders: Record<string, string>;
  storyG4DirectoryQuery: string;
  storyG4NeighborCreatePayload: StoryG4NeighborCreatePayload;
  storyG4NeighborCreateWithoutPrimaryPhonePayload: StoryG4NeighborCreatePayload;
  storyG4EnsureExistingThreadPayload: StoryG4ThreadEnsurePayload;
  storyG4EnsureNewThreadPayload: StoryG4ThreadEnsurePayload;
};

export const test = base.extend<StoryG4Fixtures>({
  storyG4Context: async ({}, use) => {
    await use(createStoryG4Context());
  },
  storyG4VolunteerHeaders: async ({ storyG4Context }, use) => {
    await use(
      createStoryG4Headers(storyG4Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG4Context.userId,
        orgUnitMemberships: [storyG4Context.orgUnitId],
      }),
    );
  },
  storyG4CrossScopeHeaders: async ({ storyG4Context }, use) => {
    await use(
      createStoryG4Headers(storyG4Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG4Context.userId,
        orgUnitId: storyG4Context.crossScopeOrgUnitId,
        orgUnitMemberships: [storyG4Context.crossScopeOrgUnitId],
      }),
    );
  },
  storyG4DirectoryQuery: async ({ storyG4Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG4Context.tenantId,
      orgUnitId: storyG4Context.orgUnitId,
      query: storyG4Context.searchTerms.byName,
    });
    await use(`?${params.toString()}`);
  },
  storyG4NeighborCreatePayload: async ({ storyG4Context }, use) => {
    await use(createStoryG4NeighborCreatePayload(storyG4Context));
  },
  storyG4NeighborCreateWithoutPrimaryPhonePayload: async ({ storyG4Context }, use) => {
    await use(
      createStoryG4NeighborCreatePayload(storyG4Context, {
        phones: [],
      }),
    );
  },
  storyG4EnsureExistingThreadPayload: async ({ storyG4Context }, use) => {
    await use(
      createStoryG4ThreadEnsurePayload(storyG4Context, {
        neighborId: storyG4Context.neighborIds.existing,
      }),
    );
  },
  storyG4EnsureNewThreadPayload: async ({ storyG4Context }, use) => {
    await use(
      createStoryG4ThreadEnsurePayload(storyG4Context, {
        neighborId: storyG4Context.neighborIds.newCandidate,
      }),
    );
  },
});

export { expect } from '@playwright/test';
