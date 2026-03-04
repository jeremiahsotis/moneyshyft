import { test as base } from '@playwright/test';
import {
  createStoryUxR4Context,
  createStoryUxR4Headers,
  type StoryUxR4Context,
} from '../factories/connectShyftStoryUxR4Factory';

type StoryUxR4Fixtures = {
  storyUxR4Context: StoryUxR4Context;
  storyUxR4OperatorHeaders: Record<string, string>;
  storyUxR4TenantAdminHeaders: Record<string, string>;
  storyUxR4ViewerHeaders: Record<string, string>;
  storyUxR4OutboundCallPayload: {
    orgUnitId: string;
  };
  storyUxR4MessageWithoutOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyUxR4MessageWithValidOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    override: {
      reasonCode: string;
      note: string;
    };
  };
  storyUxR4MessageWithInvalidOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    override: {
      reasonCode: string;
      note: string;
    };
  };
};

export const test = base.extend<StoryUxR4Fixtures>({
  storyUxR4Context: async ({}, use) => {
    await use(createStoryUxR4Context());
  },
  storyUxR4OperatorHeaders: async ({ storyUxR4Context }, use) => {
    await use(
      createStoryUxR4Headers(storyUxR4Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyUxR4Context.orgUnitId],
      }),
    );
  },
  storyUxR4TenantAdminHeaders: async ({ storyUxR4Context }, use) => {
    await use(
      createStoryUxR4Headers(storyUxR4Context, {
        role: 'TENANT_ADMIN',
        userId: storyUxR4Context.adminUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyUxR4ViewerHeaders: async ({ storyUxR4Context }, use) => {
    await use(
      createStoryUxR4Headers(storyUxR4Context, {
        role: 'TENANT_VIEWER',
        userId: storyUxR4Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyUxR4OutboundCallPayload: async ({ storyUxR4Context }, use) => {
    await use({
      orgUnitId: storyUxR4Context.orgUnitId,
    });
  },
  storyUxR4MessageWithoutOverridePayload: async ({ storyUxR4Context }, use) => {
    await use({
      orgUnitId: storyUxR4Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound guardrail action attempted without required policy override reason.',
    });
  },
  storyUxR4MessageWithValidOverridePayload: async ({ storyUxR4Context }, use) => {
    await use({
      orgUnitId: storyUxR4Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound guardrail action with approved policy override reason.',
      override: {
        reasonCode: 'SAFETY_EXCEPTION',
        note: 'Safety-critical outreach required while honoring policy audit constraints.',
      },
    });
  },
  storyUxR4MessageWithInvalidOverridePayload: async ({ storyUxR4Context }, use) => {
    await use({
      orgUnitId: storyUxR4Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound guardrail action with invalid override payload.',
      override: {
        reasonCode: 'INVALID_REASON_CODE',
        note: '',
      },
    });
  },
});

export { expect } from '@playwright/test';
