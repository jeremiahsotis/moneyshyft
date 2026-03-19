import { test as base } from '@playwright/test';
import {
  createStoryD4Context,
  createStoryD4Headers,
  type StoryD4Context,
} from '../factories/connectShyftStoryD4Factory';
import { cleanupConnectShyftThreadAndNeighborState } from '../helpers/connectShyftDbActor';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryD4Fixtures = {
  storyD4SmsSenderReady: void;
  storyD4Context: StoryD4Context;
  storyD4OperatorHeaders: Record<string, string>;
  storyD4AdminHeaders: Record<string, string>;
  storyD4TenantAdminHeaders: Record<string, string>;
  storyD4ViewerHeaders: Record<string, string>;
  storyD4OutboundCallPayload: {
    orgUnitId: string;
  };
  storyD4OutboundMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyD4MessageWithoutOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
};

export const test = base.extend<StoryD4Fixtures>({
  storyD4Context: async ({}, use) => {
    await use(createStoryD4Context());
  },
  storyD4SmsSenderReady: async ({ request, storyD4Context }, use) => {
    await cleanupConnectShyftThreadAndNeighborState({
      tenantId: storyD4Context.tenantId,
      threadIds: Object.values(storyD4Context.threadIds),
    });
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryD4Headers(storyD4Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD4Context.adminUserId,
        orgUnitMemberships: [storyD4Context.orgUnitId],
      }),
      orgUnitId: storyD4Context.orgUnitId,
      preferredNumber: '+12605550192',
      preferredLabel: 'Story D4 SMS sender',
    });
    await use();
  },
  storyD4OperatorHeaders: async ({ storyD4SmsSenderReady, storyD4Context }, use) => {
    await use(
      createStoryD4Headers(storyD4Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyD4Context.orgUnitId],
      }),
    );
  },
  storyD4AdminHeaders: async ({ storyD4SmsSenderReady, storyD4Context }, use) => {
    await use(
      createStoryD4Headers(storyD4Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD4Context.adminUserId,
        orgUnitMemberships: [storyD4Context.orgUnitId],
      }),
    );
  },
  storyD4TenantAdminHeaders: async ({ storyD4SmsSenderReady, storyD4Context }, use) => {
    await use(
      createStoryD4Headers(storyD4Context, {
        role: 'TENANT_ADMIN',
        userId: storyD4Context.adminUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyD4ViewerHeaders: async ({ storyD4SmsSenderReady, storyD4Context }, use) => {
    await use(
      createStoryD4Headers(storyD4Context, {
        role: 'TENANT_VIEWER',
        userId: storyD4Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyD4OutboundCallPayload: async ({ storyD4Context }, use) => {
    await use({
      orgUnitId: storyD4Context.orgUnitId,
    });
  },
  storyD4OutboundMessagePayload: async ({ storyD4Context }, use) => {
    await use({
      orgUnitId: storyD4Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound action requiring explicit operator-safe UI contract.',
    });
  },
  storyD4MessageWithoutOverridePayload: async ({ storyD4Context }, use) => {
    await use({
      orgUnitId: storyD4Context.orgUnitId,
      channel: 'sms',
      body: 'Attempt without override reason for prefers_texting NO.',
    });
  },
});

export { expect } from '@playwright/test';
