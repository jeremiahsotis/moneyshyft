import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryUxR4Context,
  type StoryUxR4Context,
} from '../../support/factories/connectShyftStoryUxR4Factory';

const buildThreadUrl = (
  context: StoryUxR4Context,
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

const expectThreadActions = async (
  page: Page,
  expected: string[],
): Promise<void> => {
  const labels = (await page.getByTestId('connectshyft-thread-action-label').allTextContents())
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
  expect(labels).toEqual(expected);
};

test.describe('Story ux-r4 automate - outbound policy guardrail UI journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[UXR4-AUTOMATE-E2E-201][P0] closed prefers_texting NO send action reopens same thread and opens override modal before dispatch @P0',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      // Given a CLOSED prefers_texting=NO thread detail.
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Closed');

      // When outbound SMS is attempted without an override.
      await page.getByTestId('connectshyft-send-message-thread-action').click();

      // Then the same thread is reopened and override modal blocks dispatch until reason selection.
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(/reopened/i);
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-required-chip')).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-submit')).toBeDisabled();
      await expect(page).toHaveURL(
        new RegExp(`/app/connectshyft/threads/${context.threadIds.closedPrefersNo}`),
      );
    },
  );

  test(
    '[UXR4-AUTOMATE-E2E-202][P1] tenant-admin claimed-thread action surface includes Take Over with deterministic ordering @P1',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      // Given tenant-admin context on a CLAIMED thread owned by another operator.
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.adminUserId,
          tenantRole: 'TENANT_ADMIN',
          orgUnitMemberships: [],
        }),
      );

      // When the action surface is rendered.
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Take Over' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();

      // Then action ordering and visibility remain deterministic and explicit.
      await expectThreadActions(page, ['Call', 'Take Over', 'Text', 'Close']);
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
    },
  );

  test(
    '[UXR4-AUTOMATE-E2E-203][P1] submitting a valid override from the modal dispatches and surfaces policy audit reason in accessible success feedback @P1',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      // Given an UNCLAIMED prefers_texting=NO thread where override is required.
      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();

      // When a valid override is selected and submitted.
      await page
        .getByTestId('connectshyft-preference-override-reason-select')
        .selectOption('safety-follow-up');
      await page
        .getByTestId('connectshyft-preference-override-note-input')
        .fill('Operator escalation follow-up requires documented policy exception.');
      await page.getByTestId('connectshyft-preference-override-submit').click();

      // Then outbound dispatch succeeds with deterministic, accessible success and audit feedback.
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toContainText(
        /override applied|outbound message dispatched/i,
      );
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toHaveAttribute(
        'aria-live',
        'polite',
      );
      await expect(page.getByTestId('connectshyft-preference-override-audit-chip')).toContainText(
        'SAFETY-FOLLOW-UP',
      );
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-policy-error-banner')).toHaveCount(0);
    },
  );
});
