import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { buildInboundPayload } from './ux-r3-voicemail-and-indicator-behavior.atdd.api.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD API RED) - Lifecycle',
  () => {
    test(
      '[UXR3-ATDD-API-003][P1] voicemail-only and missed-inbound events preserve escalation and inactivity windows without lifecycle reset @P1',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboundVoicemailPayload,
      }, testInfo) => {
        const detailBefore = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
          headers: storyUxR3AdminHeaders,
        });

        expect(detailBefore.status()).toBe(200);
        const detailBeforeBody = await detailBefore.json();
        const beforeThread = detailBeforeBody?.data?.thread;
        const beforeStage = beforeThread?.escalationStage;
        const beforeUrgencyLabel = beforeThread?.urgencyLabel;
        const beforeLastActivity = beforeThread?.lastActivityAtUtc;
        const beforeState = beforeThread?.state;

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: buildInboundPayload({
            context: storyUxR3Context,
            basePayload: storyUxR3InboundVoicemailPayload,
            testInfo,
            label: 'uxr3-atdd-api-003-voicemail',
            threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
            neighborId: storyUxR3Context.neighborIds.unclaimed,
          }),
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            lifecycle: {
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
          },
        });

        const missedInboundResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: buildInboundPayload({
            context: storyUxR3Context,
            basePayload: storyUxR3InboundVoicemailPayload,
            testInfo,
            label: 'uxr3-atdd-api-003-missed',
            threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
            neighborId: storyUxR3Context.neighborIds.unclaimed,
            eventType: storyUxR3Context.events.inboundMissedCall,
          }),
        });

        expect(missedInboundResponse.status()).toBe(200);
        const missedInboundBody = await missedInboundResponse.json();
        expect(missedInboundBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            lifecycle: {
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
          },
        });

        const detailAfter = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
          headers: storyUxR3AdminHeaders,
        });

        expect(detailAfter.status()).toBe(200);
        const detailAfterBody = await detailAfter.json();
        const afterThread = detailAfterBody?.data?.thread;
        expect(afterThread?.state).toBe(beforeState);
        expect(afterThread?.escalationStage).toBe(beforeStage);
        expect(afterThread?.urgencyLabel).toBe(beforeUrgencyLabel);
        expect(afterThread?.lastActivityAtUtc).toBe(beforeLastActivity);
      },
    );
  },
);
