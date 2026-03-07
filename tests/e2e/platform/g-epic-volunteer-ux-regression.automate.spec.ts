import { test, expect } from '../../support/fixtures/connectShyftStoryG6E2e.fixture';
import {
  buildStoryG6SurfaceUrl,
  buildStoryG6ThreadDetailUrl,
  createStoryG6Context,
  createStoryG6Headers,
} from '../../support/factories/connectShyftStoryG6Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';

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

  test(
    '[GEPIC-AUTO-E2E-303][P0] inbound events on CLOSED threads never auto-reopen thread detail state in volunteer surfaces @P0',
    async ({ page }, testInfo) => {
      const webhookResponse = await page.request.post(context.paths.inboundWebhook, {
        headers: createStoryG6Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        }),
        data: {
          provider: 'telnyx',
          providerEventId: deterministicProviderEventId(
            'provider-event-g-epic-e2e',
            testInfo,
            'g-epic-e2e-303-event',
          ),
          providerLegId: `leg-g-epic-e2e-${deterministicToken(testInfo, 'g-epic-e2e-303-leg')}`,
          eventType: context.events.inboundMissedCall,
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId: context.threadIds.closedInbound,
          neighborId: context.neighborIds.closedInbound,
          payload: {
            missedCall: true,
          },
        },
      });

      expect(webhookResponse.status()).toBe(200);

      await page.goto(
        buildStoryG6ThreadDetailUrl(context, context.threadIds.closedInbound, volunteerActor),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('Closed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-thread-inbound-auto-reopen-indicator')).toHaveCount(0);
    },
  );
});
