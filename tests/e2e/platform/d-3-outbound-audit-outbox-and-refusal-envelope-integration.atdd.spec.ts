import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryD3Context,
  type StoryD3Context,
} from '../../support/factories/connectShyftStoryD3Factory';

const buildThreadUrl = (
  context: StoryD3Context,
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

test.describe(
  'Story d.3 Outbound Audit, Outbox, and Refusal Envelope Integration (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] successful outbound actions render audit and outbox evidence chips with actor and lifecycle provenance @P0',
      async ({ page }) => {
        const context = createStoryD3Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await page.getByRole('button', { name: 'Call' }).click();
        await expect(page.getByTestId('connectshyft-audit-event-chip')).toContainText(
          /actor|org unit/i,
        );
        await expect(page.getByTestId('connectshyft-outbox-event-chip')).toContainText(
          /outbox written/i,
        );
      },
    );

    test.skip(
      '[P0] refusal responses surface deterministic envelope reason codes and no success-side lifecycle evidence @P0',
      async ({ page }) => {
        const context = createStoryD3Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await page.getByRole('button', { name: /Send Message|Text/i }).click();
        await page.getByTestId('connectshyft-preference-override-reason-select').selectOption(
          'INVALID_POLICY_OVERRIDE',
        );
        await page.getByTestId('connectshyft-preference-override-submit').click();

        await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toBeVisible();
        await expect(page.getByTestId('connectshyft-policy-refusal-code')).toContainText(
          /refused|forbidden|override/i,
        );
        await expect(page.getByTestId('connectshyft-audit-event-chip')).toHaveCount(0);
      },
    );

    test.skip(
      '[P1] closed-thread outbound flow explicitly renders reopen lineage with prior and new state metadata @P1',
      async ({ page }) => {
        const context = createStoryD3Context();
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
        await expect(page.getByTestId('connectshyft-lifecycle-lineage-chip')).toContainText(
          /closed -> unclaimed/i,
        );
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
          /reopened by user/i,
        );
      },
    );

    test.skip(
      '[P1] governance refusal UX preserves deterministic envelope mapping and accessible operator guidance @P1',
      async ({ page }) => {
        const context = createStoryD3Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.viewerUserId,
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).click();

        await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toBeVisible();
        await expect(page.getByTestId('connectshyft-policy-refusal-code')).toContainText(
          /close_forbidden|forbidden/i,
        );
        await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveAttribute(
          'role',
          'alert',
        );
      },
    );
  },
);
