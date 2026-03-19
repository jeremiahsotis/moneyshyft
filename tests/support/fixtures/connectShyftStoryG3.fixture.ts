import { test as base } from '@playwright/test';
import {
  createStoryG3Context,
  createStoryG3Headers,
  type StoryG3Context,
} from '../factories/connectShyftStoryG3Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryG3Fixtures = {
  storyG3SmsSenderReady: void;
  storyG3Context: StoryG3Context;
  storyG3OperatorHeaders: Record<string, string>;
  storyG3TenantAdminHeaders: Record<string, string>;
  storyG3ViewerHeaders: Record<string, string>;
  storyG3InboxQuery: string;
  storyG3MineQuery: string;
  storyG3CallPayload: {
    orgUnitId: string;
  };
  storyG3MessageWithoutOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyG3MessageWithOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    overrideReason: string;
    overrideNote: string;
  };
};

export const test = base.extend<StoryG3Fixtures>({
  storyG3Context: async ({}, use) => {
    await use(createStoryG3Context());
  },
  storyG3SmsSenderReady: async ({ request, storyG3Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryG3Headers(storyG3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG3Context.adminUserId,
        orgUnitMemberships: [storyG3Context.orgUnitId],
      }),
      orgUnitId: storyG3Context.orgUnitId,
      preferredNumber: '+12605550196',
      preferredLabel: 'Story G3 SMS sender',
    });
    await use();
  },
  storyG3OperatorHeaders: async ({ storyG3SmsSenderReady, storyG3Context }, use) => {
    await use(
      createStoryG3Headers(storyG3Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyG3Context.orgUnitId],
      }),
    );
  },
  storyG3TenantAdminHeaders: async ({ storyG3SmsSenderReady, storyG3Context }, use) => {
    await use(
      createStoryG3Headers(storyG3Context, {
        role: 'TENANT_ADMIN',
        userId: storyG3Context.adminUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyG3ViewerHeaders: async ({ storyG3SmsSenderReady, storyG3Context }, use) => {
    await use(
      createStoryG3Headers(storyG3Context, {
        role: 'TENANT_VIEWER',
        userId: storyG3Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyG3InboxQuery: async ({ storyG3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG3Context.tenantId,
      orgUnitId: storyG3Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyG3MineQuery: async ({ storyG3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyG3Context.tenantId,
      orgUnitId: storyG3Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
  storyG3CallPayload: async ({ storyG3Context }, use) => {
    await use({
      orgUnitId: storyG3Context.orgUnitId,
    });
  },
  storyG3MessageWithoutOverridePayload: async ({ storyG3Context }, use) => {
    await use({
      orgUnitId: storyG3Context.orgUnitId,
      channel: 'sms',
      body: 'Conversation-first action attempt without override metadata.',
    });
  },
  storyG3MessageWithOverridePayload: async ({ storyG3Context }, use) => {
    await use({
      orgUnitId: storyG3Context.orgUnitId,
      channel: 'sms',
      body: 'Conversation-first action with approved override metadata.',
      overrideReason: 'safety-follow-up',
      overrideNote: 'Outbound initiated from CLOSED state with documented override.',
    });
  },
});

export { expect } from '@playwright/test';
