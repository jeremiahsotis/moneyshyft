import { test, expect } from '../../support/fixtures/connectShyftStoryG6E2e.fixture';
import {
  buildStoryG6SurfaceUrl,
  createStoryG6Context,
} from '../../support/factories/connectShyftStoryG6Factory';

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const context = createStoryG6Context();

const volunteerActor = {
  role: 'ORGUNIT_MEMBER',
  userId: context.userId,
  orgUnitMemberships: [context.orgUnitId],
};

test.describe('Epic G Volunteer UX Regression (Automate E2E Expansion)', () => {
  test(
    '[GEPIC-AUTO-E2E-301][P0] queue-search context survives inbox to mine to thread transitions while volunteer-primary copy remains display-safe @P0',
    async ({ page }) => {
      await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

      const searchInput = page.getByTestId('connectshyft-queue-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('voicemail');
      await expect(page).toHaveURL(/queueSearch=voicemail/i);

      await page.getByTestId('connectshyft-bottom-nav-mine').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/mine/i);
      await expect(searchInput).toHaveValue('voicemail');

      await page.getByTestId('connectshyft-queue-card-tap-target').first().click();
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-id-chip')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-system-metadata-chip')).toHaveCount(0);

      const threadCopy = ((await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '').toLowerCase();
      for (const token of context.forbiddenPrimaryCopyTokens) {
        expect(threadCopy).not.toContain(token);
      }
      expect(threadCopy).not.toMatch(UUID_PATTERN);

      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/inbox/i);
      await expect(searchInput).toHaveValue('voicemail');
    },
  );

  test(
    '[GEPIC-AUTO-E2E-302][P1] tablet and desktop thread layouts keep split and three-column contracts deterministic after queue-card navigation @P1',
    async ({ page }) => {
      const responsiveMatrix = [
        {
          viewport: context.breakpoints.tablet,
          layoutTestId: 'connectshyft-layout-tablet-split',
          requiresTertiary: false,
        },
        {
          viewport: context.breakpoints.desktop,
          layoutTestId: 'connectshyft-layout-desktop-three-column',
          requiresTertiary: true,
        },
      ] as const;

      for (const scenario of responsiveMatrix) {
        await page.setViewportSize({
          width: scenario.viewport.width,
          height: scenario.viewport.height,
        });

        await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
        await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

        await page.getByTestId('connectshyft-queue-card-tap-target').first().click();
        await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
        await expect(page.getByTestId(scenario.layoutTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-panel')).toBeVisible();

        if (scenario.requiresTertiary) {
          await expect(page.getByTestId('connectshyft-tertiary-panel')).toBeVisible();
        }
      }
    },
  );
});
