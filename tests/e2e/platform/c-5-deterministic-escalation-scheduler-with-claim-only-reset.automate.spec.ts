import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC5Context,
  type StoryC5Context,
} from '../../support/factories/connectShyftStoryC5Factory';

const SCHEDULER_EVALUATE_PATH = '/api/v1/connectshyft/internal/escalation/evaluate';

const buildInboxUrl = (
  context: StoryC5Context,
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

  return `${context.paths.inboxUi}?${params.toString()}`;
};

test.describe(
  'Story c.5 deterministic escalation scheduler with claim-only reset (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] scheduler run updates escalation timeline chips with deterministic baseline multipliers for unclaimed threads @P0',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildInboxUrl(context, {
            actorUserId: context.schedulerUserId,
            tenantRole: 'TENANT_STAFF',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const schedulerResponse = page.waitForResponse(
          (response) =>
            response.url().includes(SCHEDULER_EVALUATE_PATH)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Run Escalation Scheduler' }).click();
        await schedulerResponse;

        await expect(page.getByTestId('connectshyft-escalation-stage-chip')).toHaveText(/Stage [1-3]/);
        await expect(page.getByTestId('connectshyft-escalation-timeline-stage-2')).toContainText(
          `${context.escalationBaselineHours.valid * 2}h`,
        );
        await expect(page.getByTestId('connectshyft-escalation-timeline-stage-3')).toContainText(
          `${context.escalationBaselineHours.valid * 3}h`,
        );
      },
    );

    test(
      '[P0] claim action resets escalation stage and clears pending-notification indicator as the only reset path @P0',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildInboxUrl(context, {
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const claimResponse = page.waitForResponse(
          (response) =>
            response.url().includes(context.paths.threadClaim)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Claim' }).click();
        await claimResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
        await expect(page.getByTestId('connectshyft-escalation-stage-chip')).toHaveText('Stage 0');
        await expect(page.getByTestId('connectshyft-escalation-pending-notification-chip')).toHaveCount(0);
      },
    );

    test(
      '[P1] repeated scheduler runs surface replay-safe summary and avoid duplicate warning indicators @P1',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildInboxUrl(context, {
            actorUserId: context.schedulerUserId,
            tenantRole: 'TENANT_STAFF',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const firstRunResponse = page.waitForResponse(
          (response) =>
            response.url().includes(SCHEDULER_EVALUATE_PATH)
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Run Escalation Scheduler' }).click();
        await firstRunResponse;

        const secondRunResponse = page.waitForResponse(
          (response) =>
            response.url().includes(SCHEDULER_EVALUATE_PATH)
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Run Escalation Scheduler' }).click();
        await secondRunResponse;

        await expect(page.getByTestId('connectshyft-escalation-run-summary')).toContainText(
          'Replay-safe: skipped already processed windows',
        );
        await expect(page.getByTestId('connectshyft-escalation-duplicate-warning')).toHaveCount(0);
      },
    );

    test(
      '[P1] tenant-viewer inbox session hides scheduler and claim controls while exposing refusal guidance @P1',
      async ({ page }) => {
        const context = createStoryC5Context();
        await login(page);

        await page.goto(
          buildInboxUrl(context, {
            actorUserId: 'user-connectshyft-c5-viewer',
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Run Escalation Scheduler' })).toHaveCount(0);
      },
    );
  },
);
