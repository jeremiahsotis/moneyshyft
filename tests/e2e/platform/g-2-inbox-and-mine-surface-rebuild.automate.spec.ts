import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG2SurfaceUrl,
  STORY_G2_UUID_PATTERN,
} from '../../helpers/connectShyftStoryG2';
import { createStoryG2Context } from '../../support/factories/connectShyftStoryG2Factory';

const getLoweredSurfaceCopy = async (page: Page): Promise<string> => {
  const surfaceCopy = (await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? '';
  return surfaceCopy.toLowerCase();
};

test.describe('Story g.2 Inbox and Mine Surface Rebuild (Automate E2E Expansion)', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[G2-AUTO-E2E-201][P0] queue rows render as full-card tap targets with summary preview timestamp and context pills while suppressing backend-centric chips @P0',
    async ({ page }) => {
      const context = createStoryG2Context();
      await login(page);

      await page.goto(
        buildStoryG2SurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

      const firstQueueCard = page.getByTestId('connectshyft-queue-card').first();
      await expect(firstQueueCard).toBeVisible();

      const cardTapTarget = firstQueueCard.getByTestId('connectshyft-queue-card-tap-target');
      await expect(cardTapTarget).toBeVisible();
      await expect(cardTapTarget).toHaveAttribute('aria-label', /open thread/i);

      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-summary')).toBeVisible();
      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-preview')).toBeVisible();
      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-timestamp')).toBeVisible();
      await expect(firstQueueCard.getByTestId('connectshyft-queue-context-pill').first()).toBeVisible();

      const loweredCopy = await getLoweredSurfaceCopy(page);
      for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
        expect(loweredCopy).not.toContain(forbiddenToken);
      }
      for (const knownThreadId of Object.values(context.threadIds)) {
        expect(loweredCopy).not.toContain(knownThreadId.toLowerCase());
      }
      expect(loweredCopy).not.toMatch(STORY_G2_UUID_PATTERN);
      expect(loweredCopy).not.toMatch(/\bpriority\s*\d+\b/i);

      await expect(page.locator('[data-testid="connectshyft-inbox-item-priority-rank"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="connectshyft-thread-id-chip"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="connectshyft-raw-state-chip"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="connectshyft-system-metadata-chip"]')).toHaveCount(0);

      await cardTapTarget.click();
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
    },
  );

  test(
    '[G2-AUTO-E2E-202][P0] queue search persists across inbox and mine navigation plus refresh while preserving deterministic row ordering @P0',
    async ({ page }) => {
      const context = createStoryG2Context();
      await login(page);

      await page.goto(
        buildStoryG2SurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      const searchInput = page.getByTestId('connectshyft-queue-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill(context.searchTerms.persistent);
      await expect(page).toHaveURL(/queueSearch=voicemail/i);

      const inboxOrderBeforeReload = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();

      const mineSurfaceResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/inbox')
          && response.request().method() === 'GET',
      );
      await page.getByTestId('connectshyft-bottom-nav-mine').click();
      await mineSurfaceResponse;
      await expect(page).toHaveURL(/\/app\/connectshyft\/mine/i);
      await expect(page).toHaveURL(/queueSearch=voicemail/i);
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);

      const mineOrderBeforeReload = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();
      await page.reload();
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);
      const mineOrderAfterReload = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();

      expect(mineOrderAfterReload).toEqual(mineOrderBeforeReload);

      const inboxRoundtripResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/inbox')
          && response.request().method() === 'GET',
      );
      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await inboxRoundtripResponse;
      await expect(page).toHaveURL(/\/app\/connectshyft\/inbox/i);
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);
      const inboxOrderAfterRoundtrip = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();
      expect(inboxOrderAfterRoundtrip).toEqual(inboxOrderBeforeReload);
    },
  );

  test(
    '[G2-AUTO-E2E-203][P0] responsive queue-to-thread behavior uses mobile full-screen thread tablet split layout and desktop three-column workflow @P0',
    async ({ page }) => {
      const context = createStoryG2Context();
      await login(page);

      const viewports: Array<{
        mode: 'mobile' | 'tablet' | 'desktop';
        width: number;
        height: number;
      }> = [
        { mode: 'mobile', ...context.breakpoints.mobile },
        { mode: 'tablet', ...context.breakpoints.tablet },
        { mode: 'desktop', ...context.breakpoints.desktop },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await page.goto(
          buildStoryG2SurfaceUrl(context, {
            bucket: 'inbox',
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
          }),
        );

        const tapTarget = page.getByTestId('connectshyft-queue-card-tap-target').first();
        await expect(tapTarget).toBeVisible();
        await tapTarget.click();
        await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

        if (viewport.mode === 'mobile') {
          await expect(page.getByTestId('connectshyft-layout-mobile-thread-fullscreen')).toBeVisible();
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeHidden();
        }

        if (viewport.mode === 'tablet') {
          await expect(page.getByTestId('connectshyft-layout-tablet-split')).toBeVisible();
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-thread-panel')).toBeVisible();
        }

        if (viewport.mode === 'desktop') {
          await expect(page.getByTestId('connectshyft-layout-desktop-three-column')).toBeVisible();
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-thread-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-tertiary-panel')).toBeVisible();
        }
      }
    },
  );

  test(
    '[G2-AUTO-E2E-204][P1] claimed voicemail thread stays in mine with visible indicator across navigation refresh and queue-thread transitions @P1',
    async ({ page }) => {
      const context = createStoryG2Context();
      await login(page);

      await page.goto(
        buildStoryG2SurfaceUrl(context, {
          bucket: 'mine',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          queueSearch: context.searchTerms.voicemail,
        }),
      );

      const voicemailCard = page.getByTestId(
        `connectshyft-thread-card-${context.threadIds.voicemailClaimed}`,
      );
      await expect(voicemailCard).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();

      await voicemailCard.getByTestId('connectshyft-queue-card-tap-target').click();
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      await page.getByTestId('connectshyft-bottom-nav-mine').click();
      await expect(voicemailCard).toBeVisible();
      await page.reload();
      await expect(voicemailCard).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();

      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await expect(
        page.getByTestId(`connectshyft-thread-card-${context.threadIds.voicemailClaimed}`),
      ).toHaveCount(0);
    },
  );
});
