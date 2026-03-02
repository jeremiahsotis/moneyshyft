import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryD4Context,
  type StoryD4Context,
} from '../../support/factories/connectShyftStoryD4Factory';

const buildThreadUrl = (
  context: StoryD4Context,
  options: {
    threadId: string;
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

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe('Story d.4 Operator Interaction Contracts for Outbound Safety (ATDD E2E)', () => {
  test(
    '[P0] desktop tablet and mobile views preserve explicit state-action matrix contracts with accessible labels @P0',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.setViewportSize({ width: 1280, height: 860 });
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Send Message|Text/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
    },
  );

  test(
    '[P0] claimed thread shows Take Over action for tenant-privileged operators with deterministic action ordering @P0',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.adminUserId,
          tenantRole: 'TENANT_ADMIN',
          orgUnitMemberships: [],
        }),
      );

      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Take Over' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
    },
  );

  test(
    '[P0] policy refusal and confirmation copy remain keyboard accessible and screen-reader ready for outbound safety workflows @P0',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByRole('button', { name: /Send Message|Text/i }).focus();
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveAttribute(
        'role',
        'alert',
      );
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveAttribute(
        'aria-live',
        'assertive',
      );
      await expect(page.getByTestId('connectshyft-preference-override-reason-select')).toHaveAttribute(
        'aria-label',
        /override reason/i,
      );
    },
  );

  test(
    '[P0] closed-thread outbound action shows explicit reopened transition and updated action set without hidden lifecycle changes @P0',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
      await page.getByRole('button', { name: 'Call' }).click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /reopened/i,
      );
      await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
    },
  );

  test(
    '[P1] prefers_texting NO override flow remains explicit with accessible refusal and success outcomes for outbound sms @P1',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByRole('button', { name: /Send Message|Text/i }).click();
      await expect(page.getByTestId('connectshyft-preference-override-submit')).toBeDisabled();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toContainText(
        /override reason/i,
      );

      await page
        .getByTestId('connectshyft-preference-override-reason-select')
        .selectOption('safety-follow-up');
      await page.getByTestId('connectshyft-preference-override-note-input').fill(
        'Safety check outreach required by policy exception.',
      );
      await page.getByTestId('connectshyft-preference-override-submit').click();

      await expect(page.getByTestId('connectshyft-policy-success-banner')).toContainText(
        /override applied/i,
      );
      await expect(page.getByTestId('connectshyft-preference-override-audit-chip')).toContainText(
        'SAFETY-FOLLOW-UP',
      );
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toHaveAttribute(
        'aria-live',
        'polite',
      );
    },
  );

  test(
    '[P1] closed prefers_texting NO send action reopens immediately and keeps override refusal path explicit @P1',
    async ({ page }) => {
      const context = createStoryD4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
      await page.getByRole('button', { name: /Send Message|Text/i }).click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /reopened/i,
      );
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toContainText(
        /override reason/i,
      );
      await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
    },
  );
});
