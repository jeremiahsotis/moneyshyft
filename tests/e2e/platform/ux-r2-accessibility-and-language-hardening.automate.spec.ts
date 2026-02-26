import { test, expect, type Locator, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryUxR2Context,
  type StoryUxR2Context,
} from '../../support/factories/connectShyftStoryUxR2Factory';

const UX_R2_E2E_IMPLEMENTATION_GAP =
  'Story ux-r2 UI selector and behavior contracts are not fully implemented yet (surface ids, accessibility metadata, feedback banners).';

const buildSurfaceUrl = (
  context: StoryUxR2Context,
  options: {
    bucket: 'inbox' | 'mine';
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships?: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: (options.orgUnitMemberships ?? [context.orgUnitId]).join(','),
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
    orgUnitMemberships?: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: (options.orgUnitMemberships ?? [context.orgUnitId]).join(','),
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

const hasForbiddenToken = (
  value: string,
  forbiddenTokens: readonly string[],
): boolean => {
  const lowered = value.toLowerCase();
  return forbiddenTokens.some((token) => lowered.includes(token.toLowerCase()));
};

test.describe('Story ux-r2 automate - accessibility and language hardening operator journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P0] responsive inbox and thread surfaces keep >=16px body copy and >=44px control targets on mobile and desktop @P0',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);
      expect(UX_R2_E2E_IMPLEMENTATION_GAP).toContain('ux-r2');

      const viewports = [
        { width: 390, height: 844 },
        { width: 1280, height: 800 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

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
        const inboxTapTarget = await readPixelMetric(
          page.getByTestId('connectshyft-thread-card-primary-action').first(),
          'minHeight',
        );

        expect(inboxFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
        expect(inboxTapTarget).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);

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
        const closeTapTarget = await readPixelMetric(
          page.getByTestId('connectshyft-close-thread-action'),
          'minHeight',
        );

        expect(threadFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
        expect(closeTapTarget).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);
      }
    },
  );

  test.fixme(
    '[P0] action labels and refusal copy stay verb-first and plain-language without RBAC or UUID leakage @P0',
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
        const trimmed = label.trim();
        const [verb = ''] = trimmed.split(/\s+/);
        expect(context.actionVerbSet).toContain(verb);
        expect(hasForbiddenToken(trimmed, context.forbiddenCopyTokens)).toBe(false);
      }

      const surfaceCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
      expect(hasForbiddenToken(surfaceCopy, context.forbiddenCopyTokens)).toBe(false);
      expect(surfaceCopy).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
      );

      await page.getByTestId('connectshyft-add-neighbor-action').click();
      await page.getByTestId('connectshyft-add-neighbor-phone').fill('');
      await page.getByTestId('connectshyft-add-neighbor-submit-action').click();

      const refusalBanner = page.getByTestId('connectshyft-feedback-banner');
      await expect(refusalBanner).toHaveAttribute('data-feedback-taxonomy', context.outcomeTaxonomy[1]);
      await expect(refusalBanner).toContainText(/^Refusal:/i);
      const refusalCopy = (await refusalBanner.textContent()) ?? '';
      expect(hasForbiddenToken(refusalCopy, context.forbiddenCopyTokens)).toBe(false);
    },
  );

  test.fixme(
    '[P1] keyboard-only traversal keeps deterministic focus order and explicit accessible names across primary controls @P1',
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
        const locator = page.getByTestId(testId);
        await expect(locator).toHaveAttribute('aria-label', /.+/);
        const outlineStyle = await locator.evaluate(
          (element) => window.getComputedStyle(element).outlineStyle,
        );
        expect(outlineStyle).not.toBe('none');
      }

      await expect(page.getByTestId('connectshyft-live-region-status')).toHaveAttribute(
        'aria-live',
        'polite',
      );
    },
  );

  test.fixme(
    '[P1] outcome feedback keeps success-refusal-error taxonomy with deterministic plain-language announcements @P1',
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
      const feedbackBanner = page.getByTestId('connectshyft-feedback-banner');
      await expect(feedbackBanner).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[0],
      );
      await expect(feedbackBanner).toContainText(/^Success:/i);

      await page.getByTestId('connectshyft-add-neighbor-action').click();
      await page.getByTestId('connectshyft-add-neighbor-phone').fill('');
      await page.getByTestId('connectshyft-add-neighbor-submit-action').click();
      await expect(feedbackBanner).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[1],
      );
      await expect(feedbackBanner).toContainText(/^Refusal:/i);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: 'thread-ux-r2-missing',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(feedbackBanner).toHaveAttribute(
        'data-feedback-taxonomy',
        context.outcomeTaxonomy[2],
      );
      await expect(feedbackBanner).toContainText(/^Error:/i);

      const statusRegion = page.getByTestId('connectshyft-live-region-status');
      await expect(statusRegion).toContainText(/success|refusal|error/i);
    },
  );

  test.fixme(
    '[P2] tenant-viewer detail route surfaces refusal guidance and hides privileged action controls @P2',
    async ({ page }) => {
      const context = createStoryUxR2Context();
      await login(page);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: `${context.userId}-viewer`,
          tenantRole: 'TENANT_VIEWER',
          orgUnitMemberships: [],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-add-neighbor-action')).toHaveCount(0);
    },
  );
});
