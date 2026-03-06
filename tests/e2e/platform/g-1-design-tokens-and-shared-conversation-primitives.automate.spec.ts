import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG1SurfaceUrl,
  parseCssSizeToPx,
  readCssVariable,
  readFontSizePx,
  readMinHeightPx,
  readStyleAttr,
  STORY_G1_UUID_PATTERN,
} from '../../helpers/connectShyftStoryG1';
import { createStoryG1Context } from '../../support/factories/connectShyftStoryG1Factory';

test.describe(
  'Story g.1 Design Tokens and Shared Conversation Primitives (Automate E2E Expansion)',
  () => {
    test(
      '[G1-AUTO-E2E-201][P0] queue-card thread-header message-bubble composer and action-bar remain token-driven via shared CSS variable contracts @P0',
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

        const queueCard = page.getByTestId('connectshyft-queue-card').first();
        await expect(queueCard).toBeVisible();
        expect(await readStyleAttr(queueCard)).toContain('var(--cs-radius-card)');
        expect(await readStyleAttr(queueCard)).toContain('var(--cs-shadow-card)');

        const urgencyPill = page.getByTestId('connectshyft-urgency-pill').first();
        await expect(urgencyPill).toBeVisible();
        expect(await readStyleAttr(urgencyPill)).toContain('var(--cs-radius-chip)');
        expect(await readStyleAttr(urgencyPill)).toContain('var(--cs-type-label-sm)');

        const bodyCopy = page.getByTestId('connectshyft-thread-card-body').first();
        await expect(bodyCopy).toBeVisible();
        expect(await readStyleAttr(bodyCopy)).toContain('var(--cs-type-body-md)');

        await page.getByTestId('connectshyft-thread-card-primary-action').first().click();
        await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

        const threadHeader = page.getByTestId('connectshyft-thread-header');
        await expect(threadHeader).toBeVisible();
        expect(await readStyleAttr(threadHeader)).toContain('var(--cs-radius-card)');
        expect(await readStyleAttr(threadHeader)).toContain('var(--cs-color-surface-subtle)');

        const messageBubble = page.getByTestId('connectshyft-message-bubble').first();
        await expect(messageBubble).toBeVisible();
        expect(await readStyleAttr(messageBubble)).toContain('var(--cs-radius-card)');

        const composer = page.getByTestId('connectshyft-composer');
        await expect(composer).toBeVisible();
        expect(await readStyleAttr(composer)).toContain('var(--cs-radius-card)');

        const composerInput = page.getByTestId('connectshyft-composer-input');
        await expect(composerInput).toBeVisible();
        expect(await readStyleAttr(composerInput)).toContain('var(--cs-type-body-md)');

        const actionBar = page.getByTestId('connectshyft-thread-action-bar');
        await expect(actionBar).toBeVisible();
        expect(await readStyleAttr(actionBar)).toContain('var(--cs-space-3)');
      },
    );

    test(
      '[G1-AUTO-E2E-202][P1] mobile tablet and desktop detail layouts expose deterministic responsive-mode markers and non-regressive body token scaling @P1',
      async ({ page }) => {
        const context = createStoryG1Context();
        await login(page);

        const tokenScaleValues: number[] = [];
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
          await page.getByTestId('connectshyft-thread-card-primary-action').first().click();
          await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
          await expect(
            page.getByTestId(`connectshyft-responsive-mode-${viewport.mode}`),
          ).toBeVisible();

          const bodyTokenScale = parseCssSizeToPx(await readCssVariable(page, '--cs-type-body-md'));
          tokenScaleValues.push(bodyTokenScale);

          const bodyFontSize = await readFontSizePx(
            page.getByTestId('connectshyft-thread-detail-body-copy'),
          );
          const firstAction = page
            .locator('[data-testid^="connectshyft-"][data-testid$="-thread-action"]')
            .first();
          await expect(firstAction).toBeVisible();
          const actionMinHeight = await readMinHeightPx(firstAction);

          expect(bodyFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
          expect(actionMinHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);
        }

        expect(tokenScaleValues[1]).toBeGreaterThanOrEqual(tokenScaleValues[0]);
        expect(tokenScaleValues[2]).toBeGreaterThanOrEqual(tokenScaleValues[1]);
      },
    );

    test(
      '[G1-AUTO-E2E-203][P1] inbox and thread primitives keep deterministic aria-label hooks while suppressing internal metadata chips from volunteer-primary surfaces @P1',
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

        const openConversation = page.getByTestId('connectshyft-open-conversation-action');
        await expect(openConversation).toHaveAttribute('aria-label', /open a conversation/i);

        const queueCardOpenAction = page
          .getByTestId('connectshyft-thread-card-primary-action')
          .first();
        await expect(queueCardOpenAction).toBeVisible();
        await expect(queueCardOpenAction).toHaveAttribute('aria-label', /open thread detail/i);
        const inboxCopy =
          ((await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? '').toLowerCase();

        await queueCardOpenAction.click();
        await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

        const actionButtons = page.locator('[data-testid="connectshyft-thread-action-bar"] button');
        const actionCount = await actionButtons.count();
        expect(actionCount).toBeGreaterThan(0);
        for (let index = 0; index < actionCount; index += 1) {
          const button = actionButtons.nth(index);
          await expect(button).toHaveAttribute('data-testid', /^connectshyft-/);
          await expect(button).toHaveAttribute('aria-label', /.+/);
        }

        await expect(page.locator('[data-testid="connectshyft-thread-id-chip"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="connectshyft-inbox-item-priority-rank"]')).toHaveCount(
          0,
        );

        const threadCopy =
          ((await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '').toLowerCase();
        const visibleCopy = `${inboxCopy} ${threadCopy}`;

        for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
          expect(visibleCopy).not.toContain(forbiddenToken);
        }
        for (const threadId of Object.values(context.threadIds)) {
          expect(visibleCopy).not.toContain(threadId.toLowerCase());
        }
        expect(visibleCopy).not.toMatch(STORY_G1_UUID_PATTERN);
        expect(visibleCopy).not.toMatch(/\bpriority\s*\d+\b/i);
      },
    );
  },
);
