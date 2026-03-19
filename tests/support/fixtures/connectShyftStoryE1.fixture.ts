import { test as base } from '@playwright/test';
import {
  createStoryE1Context,
  createStoryE1Headers,
  type StoryE1Context,
} from '../factories/connectShyftStoryE1Factory';
import { cleanupConnectShyftThreadAndNeighborState } from '../helpers/connectShyftDbActor';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryE1Fixtures = {
  storyE1RoutingNumberReady: void;
  storyE1Context: StoryE1Context;
  storyE1OperatorHeaders: Record<string, string>;
  storyE1AdminHeaders: Record<string, string>;
  storyE1NumberMappingPayload: {
    orgUnitId: string;
    providerNumberE164: string;
    label: string;
    isActive: true;
  };
};

export const test = base.extend<StoryE1Fixtures>({
  storyE1Context: async ({}, use) => {
    await use(createStoryE1Context());
  },
  storyE1RoutingNumberReady: async ({ request, storyE1Context }, use) => {
    await cleanupConnectShyftThreadAndNeighborState({
      tenantId: storyE1Context.tenantId,
      threadIds: Object.values(storyE1Context.threadIds),
    });
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryE1Headers(storyE1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE1Context.adminUserId,
        orgUnitMemberships: [storyE1Context.orgUnitId],
      }),
      orgUnitId: storyE1Context.orgUnitId,
      preferredNumber: storyE1Context.numbers.mappedInbound,
      preferredLabel: 'Story E1 inbound routing number',
    });
    await use();
  },
  storyE1OperatorHeaders: async ({ storyE1RoutingNumberReady, storyE1Context }, use) => {
    await use(
      createStoryE1Headers(storyE1Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyE1Context.orgUnitId],
      }),
    );
  },
  storyE1AdminHeaders: async ({ storyE1RoutingNumberReady, storyE1Context }, use) => {
    await use(
      createStoryE1Headers(storyE1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyE1Context.adminUserId,
        orgUnitMemberships: [storyE1Context.orgUnitId],
      }),
    );
  },
  storyE1NumberMappingPayload: async ({ storyE1Context }, use) => {
    await use({
      orgUnitId: storyE1Context.orgUnitId,
      providerNumberE164: storyE1Context.numbers.mappedInbound,
      label: 'Story e.1 mapped inbound routing number',
      isActive: true,
    });
  },
});

export { expect } from '@playwright/test';
