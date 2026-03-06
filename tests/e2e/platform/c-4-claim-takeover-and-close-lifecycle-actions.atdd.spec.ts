import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC4Context,
  type StoryC4Context,
} from '../../support/factories/connectShyftStoryC4Factory';

const buildThreadUrl = (
  context: StoryC4Context,
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

test.describe('Story c.4 Claim Takeover and Close Lifecycle Actions (ATDD E2E RED)', () => {
  test(
    '[P0] thread detail enforces claim takeover and close actions with deterministic state feedback for authorized roles @P0',
    async ({ page }) => {
      const context = createStoryC4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
      await page.getByRole('button', { name: 'Claim' }).click();
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.adminUserId,
          tenantRole: 'ORGUNIT_ADMIN',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByRole('button', { name: 'Take Over' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    },
  );

  test(
    '[P0] outbound actions from CLOSED thread reopen same thread in-place and surface operator-safe confirmation @P0',
    async ({ page }) => {
      const context = createStoryC4Context();
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
      await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(
        context.threadIds.closed,
      );
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        'Conversation reopened',
      );
    },
  );

  test(
    '[P1] inbound voicemail on CLOSED thread does not auto-reopen and action set stays in closed-state contract @P1',
    async ({ page }) => {
      const context = createStoryC4Context();
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
      await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-closed-thread-auto-reopen-banner')).toHaveCount(0);
    },
  );
});
