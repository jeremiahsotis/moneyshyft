import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import {
  buildInboundPayload,
  findThreadSummary,
} from './ux-r3-voicemail-and-indicator-behavior.atdd.api.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD API RED) - Placement',
  () => {
    test(
      '[UXR3-ATDD-API-001][P0] voicemail on claimed threads remains in Mine with voicemail indicator and never reclassifies into Inbox @P0',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3MemberHeaders,
        storyUxR3InboxQuery,
        storyUxR3MineQuery,
        storyUxR3InboundVoicemailPayload,
      }, testInfo) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: buildInboundPayload({
            context: storyUxR3Context,
            basePayload: storyUxR3InboundVoicemailPayload,
            testInfo,
            label: 'uxr3-atdd-api-001-claimed',
            threadId: storyUxR3Context.threadIds.claimedVoicemail,
            neighborId: storyUxR3Context.neighborIds.claimed,
          }),
        });
        expect(webhookResponse.status()).toBe(200);

        const mineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3MineQuery}`,
          headers: storyUxR3MemberHeaders,
        });
        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
          headers: storyUxR3MemberHeaders,
        });

        expect(mineResponse.status()).toBe(200);
        expect(inboxResponse.status()).toBe(200);

        const mineBody = await mineResponse.json();
        const inboxBody = await inboxResponse.json();

        const mineThread = findThreadSummary(
          mineBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );
        const inboxThread = findThreadSummary(
          inboxBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );

        expect(mineThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.claimedVoicemail,
          state: 'CLAIMED',
          bucket: 'mine',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.claimedVoicemail,
        });
        expect(inboxThread).toBeUndefined();
      },
    );

    test(
      '[UXR3-ATDD-API-002][P0] voicemail on unclaimed threads remains in Inbox and carries voicemail-received labeling @P0',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3MemberHeaders,
        storyUxR3InboxQuery,
        storyUxR3InboundVoicemailPayload,
      }, testInfo) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: buildInboundPayload({
            context: storyUxR3Context,
            basePayload: storyUxR3InboundVoicemailPayload,
            testInfo,
            label: 'uxr3-atdd-api-002-unclaimed',
            threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
            neighborId: storyUxR3Context.neighborIds.unclaimed,
          }),
        });
        expect(webhookResponse.status()).toBe(200);

        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
          headers: storyUxR3MemberHeaders,
        });

        expect(inboxResponse.status()).toBe(200);
        const inboxBody = await inboxResponse.json();

        const voicemailThread = findThreadSummary(
          inboxBody?.data?.items,
          storyUxR3Context.threadIds.unclaimedVoicemail,
        );

        expect(voicemailThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
          state: 'UNCLAIMED',
          bucket: 'inbox',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.unclaimedVoicemail,
        });
      },
    );
  },
);
