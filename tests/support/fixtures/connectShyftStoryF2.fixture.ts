import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';
import {
  createStoryF2Context,
  createStoryF2Headers,
  type StoryF2Context,
} from '../factories/connectShyftStoryF2Factory';
import { ensureSingleActiveConnectShyftSmsSenderMapping } from '../helpers/connectShyftNumberMappingTestHelpers';

type StoryF2Fixtures = {
  storyF2SmsSenderReady: void;
  storyF2Context: StoryF2Context;
  storyF2OperatorHeaders: Record<string, string>;
  storyF2AdminHeaders: Record<string, string>;
  storyF2OutboundCallPayload: {
    orgUnitId: string;
    providerKey: string;
  };
  storyF2OutboundMessagePayload: {
    orgUnitId: string;
    providerKey: string;
    channel: 'sms';
    body: string;
  };
  storyF2InboundWebhookPayload: {
    eventType: 'voice.connected';
    threadId: string;
    orgUnitId: string;
    tenantId: string;
    providerKey: string;
    providerEventId: string;
    callStatus: 'CONNECTED';
    providerPayload: {
      telnyxCallControlId: string;
      twilioCallSid: string;
      rawProviderStatus: 'answered';
    };
  };
  storyF2EventsByAggregateQuery: string;
  storyF2EventsByEventTypeQuery: string;
  storyF2EventsByAggregateAndTypeQuery: string;
};

export const test = base.extend<StoryF2Fixtures>({
  storyF2Context: async ({}, use) => {
    await use(createStoryF2Context());
  },
  storyF2SmsSenderReady: async ({ request, storyF2Context }, use) => {
    await ensureSingleActiveConnectShyftSmsSenderMapping({
      request,
      headers: createStoryF2Headers(storyF2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyF2Context.adminUserId,
        orgUnitMemberships: [storyF2Context.orgUnitId],
      }),
      orgUnitId: storyF2Context.orgUnitId,
      preferredNumber: '+12605550192',
      preferredLabel: 'Story F2 SMS sender',
    });
    await use();
  },
  storyF2OperatorHeaders: async ({ storyF2SmsSenderReady, storyF2Context }, use) => {
    await use(
      createStoryF2Headers(storyF2Context, {
        role: 'ORGUNIT_MEMBER',
        orgUnitMemberships: [storyF2Context.orgUnitId],
      }),
    );
  },
  storyF2AdminHeaders: async ({ storyF2SmsSenderReady, storyF2Context }, use) => {
    await use(
      createStoryF2Headers(storyF2Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyF2Context.adminUserId,
        orgUnitMemberships: [storyF2Context.orgUnitId],
      }),
    );
  },
  storyF2OutboundCallPayload: async ({ storyF2Context }, use) => {
    await use({
      orgUnitId: storyF2Context.orgUnitId,
      providerKey: storyF2Context.providers.enabledPrimary,
    });
  },
  storyF2OutboundMessagePayload: async ({ storyF2Context }, use) => {
    await use({
      orgUnitId: storyF2Context.orgUnitId,
      providerKey: storyF2Context.providers.enabledPrimary,
      channel: 'sms',
      body: 'Canonical event store contract validation message for story f.2.',
    });
  },
  storyF2InboundWebhookPayload: async ({ storyF2Context }, use) => {
    const eventToken = randomUUID().slice(0, 8);
    await use({
      eventType: 'voice.connected',
      threadId: storyF2Context.threadIds.unclaimed,
      orgUnitId: storyF2Context.orgUnitId,
      tenantId: storyF2Context.tenantId,
      providerKey: storyF2Context.providers.enabledPrimary,
      providerEventId: `provider-event-f2-voice-connected-${eventToken}`,
      callStatus: 'CONNECTED',
      providerPayload: {
        telnyxCallControlId: `telnyx-control-f2-${eventToken}`,
        twilioCallSid: `twilio-callsid-f2-${eventToken}`,
        rawProviderStatus: 'answered',
      },
    });
  },
  storyF2EventsByAggregateQuery: async ({ storyF2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyF2Context.tenantId,
      orgUnitId: storyF2Context.orgUnitId,
      aggregateId: storyF2Context.threadIds.unclaimed,
      aggregateType: 'Thread',
      limit: '50',
    });
    await use(`?${params.toString()}`);
  },
  storyF2EventsByEventTypeQuery: async ({ storyF2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyF2Context.tenantId,
      orgUnitId: storyF2Context.orgUnitId,
      eventType: storyF2Context.canonicalEventTypes.callConnected,
      limit: '50',
    });
    await use(`?${params.toString()}`);
  },
  storyF2EventsByAggregateAndTypeQuery: async ({ storyF2Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyF2Context.tenantId,
      orgUnitId: storyF2Context.orgUnitId,
      aggregateId: storyF2Context.threadIds.unclaimed,
      aggregateType: 'Thread',
      eventType: storyF2Context.canonicalEventTypes.callConnected,
      limit: '50',
    });
    await use(`?${params.toString()}`);
  },
});

export { expect } from '@playwright/test';
