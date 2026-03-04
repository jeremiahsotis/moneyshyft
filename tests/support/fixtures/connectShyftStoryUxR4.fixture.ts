import { test as base } from '@playwright/test';
import {
  createStoryUxR4Context,
  createStoryUxR4Headers,
  type StoryUxR4Context,
} from '../factories/connectShyftStoryUxR4Factory';

const sanitizeScopeToken = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 32);

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
    overrideReason: string;
    overrideNote: string;
  };
  storyUxR4MessageWithInvalidOverridePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    overrideReason: string;
    overrideNote: string;
  };
};

export const test = base.extend<StoryUxR4Fixtures>({
  storyUxR4Context: async ({}, use, testInfo) => {
    const titleScope = sanitizeScopeToken(testInfo.title);
    const scopeId = `w${testInfo.workerIndex}-r${testInfo.retry}-${titleScope || 'ux-r4'}`;
    await use(createStoryUxR4Context({ scopeId }));
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
      overrideReason: 'safety-follow-up',
      overrideNote: 'Safety-critical outreach required while honoring policy audit constraints.',
    });
  },
  storyUxR4MessageWithInvalidOverridePayload: async ({ storyUxR4Context }, use) => {
    await use({
      orgUnitId: storyUxR4Context.orgUnitId,
      channel: 'sms',
      body: 'Outbound guardrail action with invalid override payload.',
      overrideReason: 'INVALID_REASON_CODE',
      overrideNote: '',
    });
  },
});

export { expect } from '@playwright/test';
