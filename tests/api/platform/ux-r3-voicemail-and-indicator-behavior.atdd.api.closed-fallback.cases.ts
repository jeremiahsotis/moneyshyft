import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { buildInboundPayload } from './ux-r3-voicemail-and-indicator-behavior.atdd.api.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD API RED) - Closed Thread',
  () => {
    test(
      '[UXR3-ATDD-API-004][P0] closed-thread inbound voice events route to locked fallback and do not auto-reopen thread state @P0',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboundClosedPayload,
      }, testInfo) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: buildInboundPayload({
            context: storyUxR3Context,
            basePayload: storyUxR3InboundClosedPayload,
            testInfo,
            label: 'uxr3-atdd-api-004-closed',
            threadId: storyUxR3Context.threadIds.closedVoice,
            neighborId: storyUxR3Context.neighborIds.closed,
            eventType: storyUxR3Context.events.inboundMissedCall,
          }),
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            thread: {
              threadId: storyUxR3Context.threadIds.closedVoice,
              state: 'CLOSED',
            },
            lifecycle: {
              reopenedByInbound: false,
            },
            timeline: {
              routingDecision: 'intake_fallback',
            },
          },
        });

        const detailAfter = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.closedVoice}`,
          headers: storyUxR3AdminHeaders,
        });

        expect(detailAfter.status()).toBe(200);
        const detailAfterBody = await detailAfter.json();
        expect(detailAfterBody?.data?.thread?.state).toBe('CLOSED');
      },
    );
  },
);
