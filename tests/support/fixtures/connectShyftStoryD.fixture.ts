import { test as base } from '@playwright/test';
import {
  createStoryDContext,
  createStoryDHeaders,
  type StoryDContext,
} from '../factories/connectShyftStoryDFactory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryDFixtures = {
  storyDSmsSenderReady: void;
  storyDContext: StoryDContext;
  storyDMemberHeaders: Record<string, string>;
  storyDAdminHeaders: Record<string, string>;
  storyDViewerHeaders: Record<string, string>;
  storyDCallPayload: {
    orgUnitId: string;
  };
  storyDClosePayload: {
    orgUnitId: string;
    resolution: string;
  };
  storyDOutboundMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyDOverrideMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    overrideReason: string;
    overrideNote: string;
  };
  storyDInvalidOverrideMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
    overrideReason: string;
  };
  storyDInboundVoicePayload: {
    eventType: 'voice.voicemail';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
  };
};

export const test = base.extend<StoryDFixtures>({
  storyDContext: async ({}, use) => {
    await use(createStoryDContext());
  },
  storyDSmsSenderReady: async ({ request, storyDContext }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryDHeaders(storyDContext, {
        role: 'ORGUNIT_ADMIN',
        userId: storyDContext.adminUserId,
        orgUnitMemberships: [storyDContext.orgUnitId],
      }),
      orgUnitId: storyDContext.orgUnitId,
      preferredNumber: '+12605550198',
      preferredLabel: 'Story D SMS sender',
    });
    await use();
  },
  storyDMemberHeaders: async ({ storyDSmsSenderReady, storyDContext }, use) => {
    await use(
      createStoryDHeaders(storyDContext, {
        orgUnitMemberships: [storyDContext.orgUnitId],
      }),
    );
  },
  storyDAdminHeaders: async ({ storyDSmsSenderReady, storyDContext }, use) => {
    await use(
      createStoryDHeaders(storyDContext, {
        role: 'ORGUNIT_ADMIN',
        userId: storyDContext.adminUserId,
        orgUnitMemberships: [storyDContext.orgUnitId],
      }),
    );
  },
  storyDViewerHeaders: async ({ storyDSmsSenderReady, storyDContext }, use) => {
    await use(
      createStoryDHeaders(storyDContext, {
        role: 'TENANT_VIEWER',
        userId: storyDContext.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyDCallPayload: async ({ storyDContext }, use) => {
    await use({
      orgUnitId: storyDContext.orgUnitId,
    });
  },
  storyDClosePayload: async ({ storyDContext }, use) => {
    await use({
      orgUnitId: storyDContext.orgUnitId,
      resolution: 'operator-safe-close',
    });
  },
  storyDOutboundMessagePayload: async ({ storyDContext }, use) => {
    await use({
      orgUnitId: storyDContext.orgUnitId,
      channel: 'sms',
      body: 'Outbound check-in from operator.',
    });
  },
  storyDOverrideMessagePayload: async ({ storyDContext }, use) => {
    await use({
      orgUnitId: storyDContext.orgUnitId,
      channel: 'sms',
      body: 'Outbound update requiring policy override.',
      overrideReason: 'safety-follow-up',
      overrideNote: 'Neighbor requested call-back coordination.',
    });
  },
  storyDInvalidOverrideMessagePayload: async ({ storyDContext }, use) => {
    await use({
      orgUnitId: storyDContext.orgUnitId,
      channel: 'sms',
      body: 'Outbound update with invalid override.',
      overrideReason: 'x',
    });
  },
  storyDInboundVoicePayload: async ({ storyDContext }, use) => {
    await use({
      eventType: 'voice.voicemail',
      threadId: storyDContext.threadIds.closed,
      orgUnitId: storyDContext.orgUnitId,
      tenantId: storyDContext.tenantId,
    });
  },
});

export { expect } from '@playwright/test';
