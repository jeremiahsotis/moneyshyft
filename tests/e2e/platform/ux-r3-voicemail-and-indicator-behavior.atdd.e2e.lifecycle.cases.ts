import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import { login } from '../../helpers/auth';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { buildThreadDetailUrl } from './ux-r3-voicemail-and-indicator-behavior.atdd.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD E2E RED) - Lifecycle',
  () => {
    test(
      '[UXR3-ATDD-E2E-003][P1] voicemail-only events preserve escalation and inactivity timer render states in thread detail @P1',
      async ({
        page,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboundVoicemailPayload,
      }, testInfo) => {
        await login(page);

        const detailUrl = buildThreadDetailUrl(
          storyUxR3Context,
          storyUxR3Context.threadIds.unclaimedVoicemail,
        );
        await page.goto(detailUrl);
        const escalationChip = page.getByTestId('connectshyft-thread-escalation-chip');
        const inactivityChip = page.getByTestId('connectshyft-thread-inactivity-chip');
        const baselineEscalationLabel = (await escalationChip.textContent())?.trim();

        const webhookResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
          headers: storyUxR3AdminHeaders,
          data: {
            ...storyUxR3InboundVoicemailPayload,
            providerEventId: deterministicProviderEventId(
              'provider-event-uxr3-atdd-e2e',
              testInfo,
              'uxr3-atdd-e2e-003-voicemail-event',
            ),
            providerLegId: `leg-uxr3-atdd-e2e-${deterministicToken(
              testInfo,
              'uxr3-atdd-e2e-003-voicemail-leg',
            )}`,
          },
        });
        expect(webhookResponse.status()).toBe(200);

        await page.goto(detailUrl);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
        await expect(escalationChip).toHaveText(
          baselineEscalationLabel || 'Needs urgent attention',
        );
        await expect(inactivityChip).toContainText(/stable/i);

        const missedInboundResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
          headers: storyUxR3AdminHeaders,
          data: {
            ...storyUxR3InboundVoicemailPayload,
            providerEventId: deterministicProviderEventId(
              'provider-event-uxr3-atdd-e2e',
              testInfo,
              'uxr3-atdd-e2e-003-missed-event',
            ),
            providerLegId: `leg-uxr3-atdd-e2e-${deterministicToken(
              testInfo,
              'uxr3-atdd-e2e-003-missed-leg',
            )}`,
            eventType: storyUxR3Context.events.inboundMissedCall,
          },
        });
        expect(missedInboundResponse.status()).toBe(200);

        await page.goto(detailUrl);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
        await expect(escalationChip).toHaveText(
          baselineEscalationLabel || 'Needs urgent attention',
        );
        await expect(inactivityChip).toContainText(/stable/i);
      },
    );
  },
);
