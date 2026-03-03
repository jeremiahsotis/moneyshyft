import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';
import {
  createStoryUxR3Context,
  createStoryUxR3Headers,
  type StoryUxR3Context,
} from '../factories/connectShyftStoryUxR3Factory';

type StoryUxR3Fixtures = {
  storyUxR3Context: StoryUxR3Context;
  storyUxR3MemberHeaders: Record<string, string>;
  storyUxR3AdminHeaders: Record<string, string>;
  storyUxR3InboxQuery: string;
  storyUxR3MineQuery: string;
  storyUxR3InboundVoicemailPayload: Record<string, unknown>;
  storyUxR3InboundClosedPayload: Record<string, unknown>;
};

export const test = base.extend<StoryUxR3Fixtures>({
  storyUxR3Context: async ({}, use) => {
    await use(createStoryUxR3Context());
  },
  storyUxR3MemberHeaders: async ({ storyUxR3Context }, use) => {
    await use(
      createStoryUxR3Headers(storyUxR3Context, {
        orgUnitMemberships: [storyUxR3Context.orgUnitId],
      }),
    );
  },
  storyUxR3AdminHeaders: async ({ storyUxR3Context }, use) => {
    await use(
      createStoryUxR3Headers(storyUxR3Context, {
        role: 'ORGUNIT_ADMIN',
        userId: storyUxR3Context.adminUserId,
        orgUnitMemberships: [storyUxR3Context.orgUnitId],
      }),
    );
  },
  storyUxR3InboxQuery: async ({ storyUxR3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR3Context.tenantId,
      orgUnitId: storyUxR3Context.orgUnitId,
      bucket: 'inbox',
    });
    await use(`?${params.toString()}`);
  },
  storyUxR3MineQuery: async ({ storyUxR3Context }, use) => {
    const params = new URLSearchParams({
      tenantId: storyUxR3Context.tenantId,
      orgUnitId: storyUxR3Context.orgUnitId,
      bucket: 'mine',
    });
    await use(`?${params.toString()}`);
  },
  storyUxR3InboundVoicemailPayload: async ({ storyUxR3Context }, use) => {
    await use({
      provider: 'telnyx',
      providerEventId: `evt-ux-r3-voice-${randomUUID().slice(0, 8)}`,
      providerLegId: `leg-ux-r3-voice-${randomUUID().slice(0, 8)}`,
      eventType: storyUxR3Context.events.inboundVoicemail,
      tenantId: storyUxR3Context.tenantId,
      orgUnitId: storyUxR3Context.orgUnitId,
      threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
      neighborId: storyUxR3Context.neighborIds.unclaimed,
      payload: {
        voicemailDurationSeconds: 41,
      },
    });
  },
  storyUxR3InboundClosedPayload: async ({ storyUxR3Context }, use) => {
    await use({
      provider: 'telnyx',
      providerEventId: `evt-ux-r3-closed-${randomUUID().slice(0, 8)}`,
      providerLegId: `leg-ux-r3-closed-${randomUUID().slice(0, 8)}`,
      eventType: storyUxR3Context.events.inboundMissedCall,
      tenantId: storyUxR3Context.tenantId,
      orgUnitId: storyUxR3Context.orgUnitId,
      threadId: storyUxR3Context.threadIds.closedVoice,
      neighborId: storyUxR3Context.neighborIds.closed,
      payload: {
        missedCall: true,
      },
    });
  },
});

export { expect } from '@playwright/test';
