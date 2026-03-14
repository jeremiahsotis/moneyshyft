import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG1SurfaceUrl,
  buildStoryG1ThreadDetailUrl,
  readCssVariable,
  readPixelMetric,
  STORY_G1_UUID_PATTERN,
} from '../../helpers/connectShyftStoryG1';
import { createStoryG1Context } from '../../support/factories/connectShyftStoryG1Factory';

test.describe('Story g.1 Design Tokens and Shared Conversation Primitives (ATDD E2E)', () => {
  test(
    '[G1-ATDD-E2E-001][P0] core token variables are available and surfaces consume tokenized typography and touch-target primitives @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildStoryG1SurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

      for (const cssVariable of context.tokenContract.requiredCssVars) {
        const resolvedValue = await readCssVariable(page, cssVariable);
        expect(resolvedValue).not.toEqual('');
      }

      const bodyCopyLocator = page.getByTestId('connectshyft-thread-card-body').first();
      const primaryActionLocator = page
        .getByTestId('connectshyft-thread-card-primary-action')
        .first();

      await expect(bodyCopyLocator).toBeVisible();
      await expect(primaryActionLocator).toBeVisible();
      await expect(primaryActionLocator).toHaveAttribute('aria-label', /open thread detail/i);

      const bodyTextPx = await readPixelMetric(bodyCopyLocator, 'fontSize');
      const primaryActionMinHeightPx = await readPixelMetric(
        primaryActionLocator,
        'minHeight',
      );

      expect(bodyTextPx).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(primaryActionMinHeightPx).toBeGreaterThanOrEqual(
        context.readability.minTapTargetPx,
      );

      await page.locator('body').click();
      await page.keyboard.press('Tab');
      const keyboardFocusInfo = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        return {
          tagName: active?.tagName.toLowerCase() ?? '',
          testId: active?.getAttribute('data-testid') ?? '',
        };
      });

      expect(['a', 'button', 'input', 'select', 'textarea']).toContain(
        keyboardFocusInfo.tagName,
      );
      expect(keyboardFocusInfo.testId.length).toBeGreaterThan(0);
    },
  );

  test(
    '[G1-ATDD-E2E-002][P0] inbox mine and thread surfaces render shared conversation primitives instead of per-view one-off markup @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildStoryG1SurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-urgency-pill').first()).toBeVisible();

      await page.goto(
        buildStoryG1SurfaceUrl(context, {
          bucket: 'mine',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-urgency-pill').first()).toBeVisible();

      await page.goto(
        buildStoryG1ThreadDetailUrl(context, {
          threadId: context.threadIds.voicemailClaimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-header')).toBeVisible();
      await expect(page.getByTestId('connectshyft-message-bubble').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-voicemail-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-composer')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-action-bar')).toBeVisible();
    },
  );

  test(
    '[G1-ATDD-E2E-003][P0] inbox and thread primary copy remains volunteer-safe and suppresses raw identifiers priority integers and routing metadata leakage @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildStoryG1SurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      const inboxSurface = page.getByTestId('connectshyft-inbox-surface');
      await expect(inboxSurface).toBeVisible();
      const inboxCopy = ((await inboxSurface.textContent()) ?? '').toLowerCase();

      await page.goto(
        buildStoryG1ThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      const threadSurface = page.getByTestId('connectshyft-thread-surface');
      await expect(threadSurface).toBeVisible();
      const threadCopy = ((await threadSurface.textContent()) ?? '').toLowerCase();
      const visibleCopy = `${inboxCopy} ${threadCopy}`;

      for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
        expect(visibleCopy).not.toContain(forbiddenToken);
      }
      for (const internalThreadId of Object.values(context.threadIds)) {
        expect(visibleCopy).not.toContain(internalThreadId.toLowerCase());
      }
      expect(visibleCopy).not.toMatch(STORY_G1_UUID_PATTERN);
      expect(visibleCopy).not.toMatch(/\bpriority\s*\d+\b/i);
      await expect(
        page.locator('[data-testid="connectshyft-inbox-item-priority-rank"]'),
      ).toHaveCount(0);
      await expect(page.locator('[data-testid="connectshyft-thread-id-chip"]')).toHaveCount(
        0,
      );
    },
  );

  test(
    '[G1-ATDD-E2E-004][P1] mobile tablet and desktop breakpoints preserve tokenized spacing typography and minimum touch-target constraints @P1',
    async ({ page }) => {
      const context = createStoryG1Context();
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
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        await page.goto(
          buildStoryG1SurfaceUrl(context, {
            bucket: 'inbox',
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
          }),
        );

        await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

        const bodyTextLocator = page.getByTestId('connectshyft-thread-card-body').first();
        const primaryActionLocator = page
          .getByTestId('connectshyft-thread-card-primary-action')
          .first();
        const actionBar = page.getByTestId('connectshyft-inbox-action-bar');

        await expect(bodyTextLocator).toBeVisible();
        await expect(primaryActionLocator).toBeVisible();
        await expect(actionBar).toBeVisible();

        const bubbleFontSize = await readPixelMetric(bodyTextLocator, 'fontSize');
        const actionBarMinHeight = await readPixelMetric(
          primaryActionLocator,
          'minHeight',
        );
        const actionBarGap = await readPixelMetric(actionBar, 'gap');

        expect(bubbleFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
        expect(actionBarMinHeight).toBeGreaterThanOrEqual(
          context.readability.minTapTargetPx,
        );
        expect(actionBarGap).toBeGreaterThan(0);
      }
    },
  );
});
