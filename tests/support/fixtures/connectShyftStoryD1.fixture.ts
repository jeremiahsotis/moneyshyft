import { test as base } from '@playwright/test';
import {
  createStoryD1Context,
  createStoryD1Headers,
  type StoryD1Context,
} from '../factories/connectShyftStoryD1Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryD1Fixtures = {
  storyD1SmsSenderReady: void;
  storyD1Context: StoryD1Context;
  storyD1OperatorHeaders: Record<string, string>;
  storyD1AdminHeaders: Record<string, string>;
  storyD1ViewerHeaders: Record<string, string>;
  storyD1OutboundCallPayload: {
    orgUnitId: string;
  };
  storyD1OutboundMessagePayload: {
    orgUnitId: string;
    channel: 'sms';
    body: string;
  };
  storyD1VoiceConnectedPayload: {
    eventType: 'voice.connected';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
    callStatus: 'CONNECTED';
    callSessionId: string;
  };
  storyD1InboundVoiceVoicemailPayload: {
    eventType: 'voice.voicemail';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
  };
  storyD1InboundVoiceFallbackPayload: {
    eventType: 'voice.fallback';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
  };
};

export const test = base.extend<StoryD1Fixtures>({
  storyD1Context: async ({}, use) => {
    await use(createStoryD1Context());
  },
  storyD1SmsSenderReady: async ({ request, storyD1Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryD1Headers(storyD1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD1Context.adminUserId,
        orgUnitMemberships: [storyD1Context.orgUnitId],
      }),
      orgUnitId: storyD1Context.orgUnitId,
      preferredNumber: '+12605550195',
      preferredLabel: 'Story D1 SMS sender',
    });
    await use();
  },
  storyD1OperatorHeaders: async ({ storyD1SmsSenderReady, storyD1Context }, use) => {
    await use(
      createStoryD1Headers(storyD1Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyD1Context.orgUnitId],
      }),
    );
  },
  storyD1AdminHeaders: async ({ storyD1SmsSenderReady, storyD1Context }, use) => {
    await use(
      createStoryD1Headers(storyD1Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyD1Context.adminUserId,
        orgUnitMemberships: [storyD1Context.orgUnitId],
      }),
    );
  },
  storyD1ViewerHeaders: async ({ storyD1SmsSenderReady, storyD1Context }, use) => {
    await use(
      createStoryD1Headers(storyD1Context, {
        role: 'TENANT_VIEWER',
        userId: storyD1Context.viewerUserId,
        orgUnitMemberships: [],
      }),
    );
  },
  storyD1OutboundCallPayload: async ({ storyD1Context }, use) => {
    await use({
      orgUnitId: storyD1Context.orgUnitId,
    });
  },
  storyD1OutboundMessagePayload: async ({ storyD1Context }, use) => {
    await use({
      orgUnitId: storyD1Context.orgUnitId,
      channel: 'sms',
      body: 'Operator outbound policy-safe message for story d.1.',
    });
  },
  storyD1VoiceConnectedPayload: async ({ storyD1Context }, use) => {
    await use({
      eventType: 'voice.connected',
      threadId: storyD1Context.threadIds.unclaimed,
      orgUnitId: storyD1Context.orgUnitId,
      tenantId: storyD1Context.tenantId,
      callStatus: 'CONNECTED',
      callSessionId: 'call-session-d1-connected-1001',
    });
  },
  storyD1InboundVoiceVoicemailPayload: async ({ storyD1Context }, use) => {
    await use({
      eventType: 'voice.voicemail',
      threadId: storyD1Context.threadIds.closed,
      orgUnitId: storyD1Context.orgUnitId,
      tenantId: storyD1Context.tenantId,
    });
  },
  storyD1InboundVoiceFallbackPayload: async ({ storyD1Context }, use) => {
    await use({
      eventType: 'voice.fallback',
      threadId: storyD1Context.threadIds.closed,
      orgUnitId: storyD1Context.orgUnitId,
      tenantId: storyD1Context.tenantId,
    });
  },
});

export { expect } from '@playwright/test';
