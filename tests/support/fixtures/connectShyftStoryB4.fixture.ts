import { test as base } from '@playwright/test';
import {
  createStoryB4Context,
  createStoryB4Headers,
  type StoryB4Context,
  type StoryB4NeighborMergePayload,
} from '../factories/connectShyftStoryB4Factory';

type StoryB4Fixtures = {
  storyB4Context: StoryB4Context;
  storyB4TenantAdminHeaders: Record<string, string>;
  storyB4IdentityLeadHeaders: Record<string, string>;
  storyB4OrgUnitMemberHeaders: Record<string, string>;
  storyB4ValidMergePayload: StoryB4NeighborMergePayload;
  storyB4MissingConfirmationPayload: StoryB4NeighborMergePayload;
  storyB4RollbackProbePayload: StoryB4NeighborMergePayload;
};

export const test = base.extend<StoryB4Fixtures>({
  storyB4Context: async ({}, use) => {
    await use(createStoryB4Context());
  },
  storyB4TenantAdminHeaders: async ({ storyB4Context }, use) => {
    await use(
      createStoryB4Headers(storyB4Context, {
        role: 'TENANT_ADMIN',
        userId: storyB4Context.tenantAdminUserId,
        orgUnitId: storyB4Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB4Context.primaryOrgUnitId],
      }),
    );
  },
  storyB4IdentityLeadHeaders: async ({ storyB4Context }, use) => {
    await use(
      createStoryB4Headers(storyB4Context, {
        role: 'ORGUNIT_IDENTITY_LEAD',
        userId: storyB4Context.identityLeadUserId,
        orgUnitId: storyB4Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB4Context.primaryOrgUnitId],
      }),
    );
  },
  storyB4OrgUnitMemberHeaders: async ({ storyB4Context }, use) => {
    await use(
      createStoryB4Headers(storyB4Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyB4Context.orgUnitMemberUserId,
        orgUnitId: storyB4Context.primaryOrgUnitId,
        orgUnitMemberships: [storyB4Context.primaryOrgUnitId],
      }),
    );
  },
  storyB4ValidMergePayload: async ({ storyB4Context }, use) => {
    await use({
      orgUnitId: storyB4Context.primaryOrgUnitId,
      sourceNeighborId: storyB4Context.sourceNeighborId,
      survivorNeighborId: storyB4Context.survivorNeighborId,
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: storyB4Context.irreversibleConfirmationPhrase,
      },
      reason: 'duplicate-identity-resolution',
    });
  },
  storyB4MissingConfirmationPayload: async ({ storyB4Context }, use) => {
    await use({
      orgUnitId: storyB4Context.primaryOrgUnitId,
      sourceNeighborId: storyB4Context.sourceNeighborId,
      survivorNeighborId: storyB4Context.survivorNeighborId,
      irreversibleConfirmation: {
        acknowledged: false,
        phrase: '',
      },
      reason: 'duplicate-identity-resolution',
    });
  },
  storyB4RollbackProbePayload: async ({ storyB4Context }, use) => {
    await use({
      orgUnitId: storyB4Context.primaryOrgUnitId,
      sourceNeighborId: storyB4Context.sourceNeighborId,
      survivorNeighborId: storyB4Context.survivorNeighborId,
      irreversibleConfirmation: {
        acknowledged: true,
        phrase: storyB4Context.irreversibleConfirmationPhrase,
      },
      reason: 'rollback-verification',
      simulateFailureStage: 'before-commit',
    });
  },
});

export { expect } from '@playwright/test';
