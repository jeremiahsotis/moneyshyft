import { login } from '../../helpers/auth';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { buildSurfaceUrl } from './ux-r3-voicemail-and-indicator-behavior.atdd.shared';

test.describe(
  'Story ux-r3 Voicemail and Indicator Behavior (ATDD E2E RED) - Placement',
  () => {
    test(
      '[UXR3-ATDD-E2E-001][P0] claimed-thread voicemail remains on Mine surface and exposes voicemail indicator without Inbox bounce @P0',
      async ({ page, storyUxR3Context }) => {
        await login(page);

        await page.goto(buildSurfaceUrl(storyUxR3Context, 'mine'));
        await expect(
          page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
        ).toBeVisible();
        await expect(
          page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.claimedVoicemail}`),
        ).toBeVisible();

        await page.goto(buildSurfaceUrl(storyUxR3Context, 'inbox'));
        await expect(
          page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
        ).toHaveCount(0);
      },
    );

    test(
      '[UXR3-ATDD-E2E-002][P0] unclaimed-thread voicemail remains in Inbox with voicemail-received labeling @P0',
      async ({ page, storyUxR3Context }) => {
        await login(page);

        await page.goto(buildSurfaceUrl(storyUxR3Context, 'inbox'));
        await expect(
          page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
        ).toBeVisible();
        await expect(
          page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
        ).toBeVisible();
        await expect(
          page.getByTestId(`connectshyft-voicemail-label-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
        ).toHaveText(storyUxR3Context.expectedLabels.unclaimedVoicemail);
      },
    );
  },
);
