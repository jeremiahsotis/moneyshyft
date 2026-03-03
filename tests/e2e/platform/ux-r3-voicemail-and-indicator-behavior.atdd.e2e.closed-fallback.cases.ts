import { login } from '../../helpers/auth';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { buildThreadDetailUrl } from './ux-r3-voicemail-and-indicator-behavior.atdd.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD E2E RED) - Closed Thread',
  () => {
    test(
      '[UXR3-ATDD-E2E-004][P0] closed-thread inbound voice events preserve CLOSED state and show locked fallback treatment @P0',
      async ({
        page,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboundClosedPayload,
      }) => {
        await login(page);

        const webhookResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
          headers: storyUxR3AdminHeaders,
          data: storyUxR3InboundClosedPayload,
        });
        expect(webhookResponse.status()).toBe(200);

        await page.goto(
          buildThreadDetailUrl(storyUxR3Context, storyUxR3Context.threadIds.closedVoice),
        );
        const webhookBody = await webhookResponse.json();
        expect(webhookBody?.data?.timeline?.routingDecision).toBe('intake_fallback');

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('CLOSED');
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
      },
    );
  },
);
