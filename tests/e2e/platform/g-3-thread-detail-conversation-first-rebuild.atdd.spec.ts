import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryG3Context,
  type StoryG3Context,
} from '../../support/factories/connectShyftStoryG3Factory';

const buildStoryG3UrlParams = (
  context: StoryG3Context,
  options: {
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  return params.toString();
};

const buildStoryG3ThreadDetailUrl = (
  context: StoryG3Context,
  threadId: string,
  options: {
    actorUserId?: string;
    tenantRole?: string;
    orgUnitMemberships?: string[];
  } = {},
): string => {
  const actorUserId = options.actorUserId ?? context.userId;
  const tenantRole = options.tenantRole ?? 'ORGUNIT_MEMBER';
  const orgUnitMemberships = options.orgUnitMemberships ?? [context.orgUnitId];

  return `${context.paths.threadDetailUi}/${threadId}?${buildStoryG3UrlParams(context, {
    actorUserId,
    tenantRole,
    orgUnitMemberships,
  })}`;
};

test.describe('Story g.3 Thread Detail Conversation-First Rebuild (ATDD E2E RED)', () => {
  test(
    '[G3-ATDD-E2E-001][P0] thread detail header/body prioritizes neighbor conference and claim context with conversation-first hierarchy @P0',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(buildStoryG3ThreadDetailUrl(context, context.threadIds.claimed));
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();

      await expect(page.getByTestId('connectshyft-thread-primary-context-panel')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-neighbor')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-conference')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-claim')).toBeVisible();

      const ordering = await page.evaluate(() => {
        const ids = [
          'connectshyft-thread-context-neighbor',
          'connectshyft-thread-context-conference',
          'connectshyft-thread-context-claim',
        ];
        return ids.map((id) => {
          const node = document.querySelector(`[data-testid="${id}"]`);
          return node ? (node as HTMLElement).getBoundingClientRect().top : Number.POSITIVE_INFINITY;
        });
      });

      expect(ordering[0]).toBeLessThanOrEqual(ordering[1]);
      expect(ordering[1]).toBeLessThanOrEqual(ordering[2]);
    },
  );

  test(
    '[G3-ATDD-E2E-002][P0] voicemail renders as first-class inline timeline conversation content in thread detail @P0',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(buildStoryG3ThreadDetailUrl(context, context.threadIds.voicemailClaimed));

      await expect(page.getByTestId('connectshyft-thread-timeline')).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-thread-timeline-event-voicemail').first(),
      ).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-thread-timeline-event-voicemail').first(),
      ).toContainText(/voicemail/i);
    },
  );

  test(
    '[G3-ATDD-E2E-003][P0] visible thread actions remain explicitly locked by state matrix for UNCLAIMED CLAIMED and CLOSED @P0',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      const scenarios = [
        {
          threadId: context.threadIds.unclaimed,
          expectedActions: [...context.expectedActions.unclaimed],
        },
        {
          threadId: context.threadIds.claimed,
          expectedActions: [...context.expectedActions.claimed],
        },
        {
          threadId: context.threadIds.closed,
          expectedActions: [...context.expectedActions.closed],
        },
      ];

      for (const scenario of scenarios) {
        await page.goto(buildStoryG3ThreadDetailUrl(context, scenario.threadId));
        await expect(page.getByTestId('connectshyft-thread-action-bar')).toBeVisible();

        const labels = (await page.getByTestId('connectshyft-thread-action-label').allTextContents())
          .map((label) => label.trim())
          .filter((label) => label.length > 0);
        expect(labels).toEqual(scenario.expectedActions);
      }
    },
  );

  test(
    '[G3-ATDD-E2E-003A][P1] claimed thread action bar stays canonical for privileged role contexts @P1',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(buildStoryG3ThreadDetailUrl(
        context,
        context.threadIds.claimed,
        {
          actorUserId: context.adminUserId,
          tenantRole: 'TENANT_ADMIN',
          orgUnitMemberships: [context.orgUnitId],
        },
      ));
      await expect(page.getByTestId('connectshyft-thread-action-bar')).toBeVisible();

      const labels = (await page.getByTestId('connectshyft-thread-action-label').allTextContents())
        .map((label) => label.trim())
        .filter((label) => label.length > 0);

      expect(labels).toEqual([...context.expectedActions.claimed]);
      expect(labels).not.toContain('Take Over');
    },
  );

  test(
    '[G3-ATDD-E2E-004][P1] policy and refusal feedback appears contextually at action time without persistent operations-heavy chrome @P1',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(context, context.threadIds.unclaimedPrefersNo),
      );

      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-action-feedback-contextual')).toBeVisible();

      for (const persistentChromeTestId of context.forbiddenPersistentChromeTestIds) {
        await expect(page.locator(`[data-testid="${persistentChromeTestId}"]`)).toHaveCount(0);
      }
    },
  );

  test(
    '[G3-ATDD-E2E-005][P0] CLOSED outbound action reopens same thread id with deterministic lifecycle messaging and no inbound auto-reopen side effects @P0',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(context, context.threadIds.closedPrefersNo),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Closed');

      await page.getByTestId('connectshyft-send-message-thread-action').click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
      await expect(page).toHaveURL(
        new RegExp(`/app/connectshyft/threads/${context.threadIds.closedPrefersNo}`),
      );
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /reopened/i,
      );
      await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-thread-inbound-auto-reopen-indicator')).toHaveCount(0);
    },
  );
});
