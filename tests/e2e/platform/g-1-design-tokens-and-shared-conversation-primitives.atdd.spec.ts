import { test, expect, type Locator, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryG1Context,
  type StoryG1Context,
} from '../../support/factories/connectShyftStoryG1Factory';

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const buildSurfaceUrl = (
  context: StoryG1Context,
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
  context: StoryG1Context,
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

const readCssVariable = async (
  page: Page,
  variableName: string,
): Promise<string> =>
  page.evaluate(
    (name) =>
      window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim(),
    variableName,
  );

const readPixelMetric = async (
  locator: Locator,
  property: 'fontSize' | 'minHeight' | 'gap',
): Promise<number> =>
  locator.evaluate(
    (element, requestedProperty) =>
      Number.parseFloat(window.getComputedStyle(element)[requestedProperty] || '0'),
    property,
  );

test.describe('Story g.1 Design Tokens and Shared Conversation Primitives (ATDD E2E RED)', () => {
  test.skip(
    '[P0] core token variables are available and surfaces consume tokenized typography and touch-target primitives @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
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

      const bodyTextPx = await readPixelMetric(
        page.getByTestId('connectshyft-thread-card-body').first(),
        'fontSize',
      );
      const primaryActionMinHeightPx = await readPixelMetric(
        page.getByTestId('connectshyft-thread-card-primary-action').first(),
        'minHeight',
      );

      expect(bodyTextPx).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(primaryActionMinHeightPx).toBeGreaterThanOrEqual(
        context.readability.minTapTargetPx,
      );
    },
  );

  test.skip(
    '[P0] inbox mine and thread surfaces render shared conversation primitives instead of per-view one-off markup @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-urgency-pill').first()).toBeVisible();

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'mine',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-urgency-pill').first()).toBeVisible();

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.voicemailClaimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-thread-header')).toBeVisible();
      await expect(page.getByTestId('connectshyft-message-bubble').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-voicemail-card').first()).toBeVisible();
      await expect(page.getByTestId('connectshyft-composer')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-action-bar')).toBeVisible();
    },
  );

  test.skip(
    '[P0] inbox and thread primary copy remains volunteer-safe and suppresses raw identifiers priority integers and routing metadata leakage @P0',
    async ({ page }) => {
      const context = createStoryG1Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      const inboxCopy = (
        (await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? ''
      ).toLowerCase();
      const threadCopy = (
        (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? ''
      ).toLowerCase();
      const visibleCopy = `${inboxCopy} ${threadCopy}`;

      for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
        expect(visibleCopy).not.toContain(forbiddenToken);
      }
      expect(visibleCopy).not.toMatch(UUID_PATTERN);
      expect(visibleCopy).not.toMatch(/\bpriority\s*\d+\b/i);
    },
  );

  test.skip(
    '[P1] mobile tablet and desktop breakpoints preserve tokenized spacing typography and minimum touch-target constraints @P1',
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
          buildThreadDetailUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
        await expect(
          page.getByTestId(`connectshyft-responsive-mode-${viewport.mode}`),
        ).toBeVisible();

        const bubbleFontSize = await readPixelMetric(
          page.getByTestId('connectshyft-message-bubble').first(),
          'fontSize',
        );
        const actionBarMinHeight = await readPixelMetric(
          page.getByTestId('connectshyft-thread-action-bar'),
          'minHeight',
        );
        const actionBarGap = await readPixelMetric(
          page.getByTestId('connectshyft-thread-action-bar'),
          'gap',
        );

        expect(bubbleFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
        expect(actionBarMinHeight).toBeGreaterThanOrEqual(
          context.readability.minTapTargetPx,
        );
        expect(actionBarGap).toBeGreaterThan(0);
      }
    },
  );
});
