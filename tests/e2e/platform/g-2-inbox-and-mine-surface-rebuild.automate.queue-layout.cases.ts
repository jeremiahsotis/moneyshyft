import { test } from '@playwright/test';
import {
  expect,
  STORY_G2_UUID_PATTERN,
  buildStoryG2SurfaceUrl,
  createStoryG2Context,
  getLoweredSurfaceCopy,
  login,
  openStoryG2Surface,
} from './g-2-inbox-and-mine-surface-rebuild.automate.shared';

test.describe('Story g.2 Inbox and Mine Surface Rebuild (Automate E2E Expansion) - Queue Layout', () => {
  const expectRelativeOrderPreserved = (baseline: string[], candidate: string[]): void => {
    const baselineIndex = new Map(baseline.map((item, index) => [item, index]));
    const overlapInCandidateOrder = candidate.filter((item) => baselineIndex.has(item));
    const overlapInBaselineOrder = [...overlapInCandidateOrder].sort(
      (left, right) => (baselineIndex.get(left) ?? 0) - (baselineIndex.get(right) ?? 0),
    );
    expect(overlapInCandidateOrder).toEqual(overlapInBaselineOrder);
  };

  test(
    '[G2-AUTO-E2E-201][P0] queue rows render as full-card tap targets with summary preview timestamp and context pills while suppressing backend-centric chips @P0',
    async ({ page }) => {
      const context = createStoryG2Context();
      await openStoryG2Surface({
        page,
        context,
        bucket: 'inbox',
      });

      const firstQueueCard = page.getByTestId('connectshyft-queue-card').first();
      await expect(firstQueueCard).toBeVisible();

      const cardTapTarget = firstQueueCard.getByTestId('connectshyft-queue-card-tap-target');
      await expect(cardTapTarget).toBeVisible();
      await expect(cardTapTarget).toHaveAttribute('aria-label', /open thread/i);

      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-summary')).toHaveText(/\S+/);
      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-preview')).toHaveText(/\S+/);
      await expect(firstQueueCard.getByTestId('connectshyft-queue-card-timestamp')).toHaveText(/\S+/);
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
      await openStoryG2Surface({
        page,
        context,
        bucket: 'inbox',
      });

      const searchInput = page.getByTestId('connectshyft-queue-search-input');
      await expect(searchInput).toBeVisible();
      await searchInput.fill(context.searchTerms.persistent);
      await expect(page).toHaveURL(/queueSearch=follow-up/i);

      await expect
        .poll(async () => (await page.getByTestId('connectshyft-thread-card-body').allTextContents()).length)
        .toBeGreaterThan(0);
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
      await expect(page).toHaveURL(/queueSearch=follow-up/i);
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);

      await expect
        .poll(async () => (await page.getByTestId('connectshyft-thread-card-body').allTextContents()).length)
        .toBeGreaterThan(0);
      const mineOrderBeforeReload = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();
      await page.reload();
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);
      await expect
        .poll(async () => (await page.getByTestId('connectshyft-thread-card-body').allTextContents()).length)
        .toBeGreaterThan(0);
      const mineOrderAfterReload = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();

      expectRelativeOrderPreserved(mineOrderBeforeReload, mineOrderAfterReload);

      const inboxRoundtripResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/inbox')
          && response.request().method() === 'GET',
      );
      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await inboxRoundtripResponse;
      await expect(page).toHaveURL(/\/app\/connectshyft\/inbox/i);
      await expect(searchInput).toHaveValue(context.searchTerms.persistent);
      await expect
        .poll(async () => (await page.getByTestId('connectshyft-thread-card-body').allTextContents()).length)
        .toBeGreaterThan(0);
      const inboxOrderAfterRoundtrip = await page
        .getByTestId('connectshyft-thread-card-body')
        .allTextContents();
      expectRelativeOrderPreserved(inboxOrderBeforeReload, inboxOrderAfterRoundtrip);
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
});
