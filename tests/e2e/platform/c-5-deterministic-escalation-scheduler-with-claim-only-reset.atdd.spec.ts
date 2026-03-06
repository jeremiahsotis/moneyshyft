import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC5Context,
  type StoryC5Context,
} from '../../support/factories/connectShyftStoryC5Factory';

const buildInboxUrl = (context: StoryC5Context, actorUserId: string, tenantRole: string): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId,
    tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.inboxUi}?${params.toString()}`;
};

test.describe(
  'Story c.5 Deterministic Escalation Scheduler with Claim-Only Reset (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] inbox timeline surfaces deterministic X-2X-3X escalation progression for unclaimed threads @P0',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId, 'ORGUNIT_MEMBER'));

        await expect(page.getByTestId('connectshyft-thread-card')).toBeVisible();
        await expect(page.getByTestId('connectshyft-escalation-stage-chip')).toHaveText('Stage 1');
        await expect(page.getByTestId('connectshyft-escalation-next-due')).toContainText('6h');
        await expect(page.getByTestId('connectshyft-escalation-timeline-stage-2')).toContainText('12h');
        await expect(page.getByTestId('connectshyft-escalation-timeline-stage-3')).toContainText('18h');
      },
    );

    test.skip(
      '[P0] claim action clears escalation badges and pending-notification indicators while preserving thread ownership traceability @P0',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId, 'ORGUNIT_MEMBER'));
        await page.getByRole('button', { name: 'Claim' }).click();

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
        await expect(page.getByTestId('connectshyft-escalation-stage-chip')).toHaveText('Stage 0');
        await expect(page.getByTestId('connectshyft-escalation-pending-notification-chip')).toHaveCount(0);
      },
    );

    test.skip(
      '[P1] scheduler rerun indicators show replay-safe no-op semantics instead of duplicate escalation updates in operator timeline @P1',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.schedulerUserId, 'TENANT_STAFF'));

        await page.getByRole('button', { name: 'Run Escalation Scheduler' }).click();
        await page.getByRole('button', { name: 'Run Escalation Scheduler' }).click();

        await expect(page.getByTestId('connectshyft-escalation-run-summary')).toContainText(
          'Replay-safe: skipped already processed windows',
        );
        await expect(page.getByTestId('connectshyft-escalation-duplicate-warning')).toHaveCount(0);
      },
    );
  },
);
