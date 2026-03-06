import { test, expect, type Locator, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryUxR2Context,
  type StoryUxR2Context,
} from '../../support/factories/connectShyftStoryUxR2Factory';

const buildSurfaceUrl = (
  context: StoryUxR2Context,
  options: {
    bucket: 'inbox' | 'mine';
    actorUserId: string;
    tenantRole: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  const basePath = options.bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${basePath}?${params.toString()}`;
};

const buildThreadDetailUrl = (
  context: StoryUxR2Context,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

const readPixelMetric = async (
  locator: Locator,
  property: 'fontSize' | 'minHeight',
): Promise<number> =>
  locator.evaluate(
    (element, requestedProperty) =>
      Number.parseFloat(window.getComputedStyle(element)[requestedProperty]),
    property,
  );

const readActiveDataTestId = async (page: Page): Promise<string> =>
  page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');

test.describe('Story ux-r2 Accessibility and Language Hardening (ATDD E2E RED)', () => {
  test.skip(
    '[P0] inbox mine thread add-neighbor and close controls enforce >=16px body copy and >=44px tap targets across core surfaces @P0',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

      const inboxFontSize = await readPixelMetric(
        page.getByTestId('connectshyft-thread-card-body').first(),
        'fontSize',
      );
      const inboxTapTargetHeight = await readPixelMetric(
        page.getByTestId('connectshyft-thread-card-primary-action').first(),
        'minHeight',
      );
      expect(inboxFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(inboxTapTargetHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      const threadFontSize = await readPixelMetric(
        page.getByTestId('connectshyft-thread-detail-body-copy'),
        'fontSize',
      );
      const closeTapTargetHeight = await readPixelMetric(
        page.getByTestId('connectshyft-close-thread-action'),
        'minHeight',
      );
      expect(threadFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(closeTapTargetHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);

      await page.getByTestId('connectshyft-add-neighbor-action').click();
      const addNeighborTapTargetHeight = await readPixelMetric(
        page.getByTestId('connectshyft-add-neighbor-submit-action'),
        'minHeight',
      );
      expect(addNeighborTapTargetHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);
    },
  );

  test.skip(
    '[P0] action labels stay verb-first and visible copy avoids RBAC internal identifiers and UUID leakage @P0',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      const actionLabels = await page.getByTestId('connectshyft-thread-action-label').allTextContents();
      expect(actionLabels.length).toBeGreaterThan(0);
      for (const label of actionLabels) {
        const [verb = ''] = label.trim().split(/\s+/);
        expect(context.actionVerbSet).toContain(verb);
      }

      const surfaceCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
      const loweredSurfaceCopy = surfaceCopy.toLowerCase();
      for (const forbiddenToken of context.forbiddenCopyTokens) {
        expect(loweredSurfaceCopy).not.toContain(forbiddenToken);
      }
      expect(surfaceCopy).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      );
    },
  );

  test.skip(
    '[P1] keyboard-only and screen-reader flows preserve deterministic focus order accessible names and announcement behavior @P1',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      const observedFocusOrder: string[] = [];
      for (let index = 0; index < context.focusOrder.length; index += 1) {
        await page.keyboard.press('Tab');
        observedFocusOrder.push(await readActiveDataTestId(page));
      }
      expect(observedFocusOrder).toEqual([...context.focusOrder]);

      for (const testId of context.focusOrder) {
        await expect(page.getByTestId(testId)).toHaveAttribute('aria-label', /.+/);
      }
      await expect(page.getByTestId('connectshyft-live-region-status')).toHaveAttribute(
        'aria-live',
        'polite',
      );
    },
  );

  test.skip(
    '[P1] outcome copy and announcements map explicitly to success refusal and error taxonomy with plain language feedback @P1',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await page.getByTestId('connectshyft-close-thread-action').click();
      await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[0],
      );

      await page.getByTestId('connectshyft-add-neighbor-action').click();
      await page.getByTestId('connectshyft-add-neighbor-phone').fill('');
      await page.getByTestId('connectshyft-add-neighbor-submit-action').click();
      await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[1],
      );

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: 'thread-ux-r2-missing',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[2],
      );
      await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(
        /^(Success|Refusal|Error):/,
      );
    },
  );
});
