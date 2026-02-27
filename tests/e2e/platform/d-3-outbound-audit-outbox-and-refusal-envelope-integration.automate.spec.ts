import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryDContext,
  type StoryDContext,
} from '../../support/factories/connectShyftStoryDFactory';

const D3_E2E_IMPLEMENTATION_GAP =
  'Story d.3 UI traceability chips (audit/outbox lineage and refusal diagnostics) are not fully implemented yet.';

const buildThreadUrl = (
  context: StoryDContext,
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
  'Story d.3 outbound audit/outbox and refusal envelope integration (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] successful close/outbound actions surface durable audit + outbox evidence chips with actor/scope metadata @P0',
      async ({ page }) => {
        const context = createStoryDContext();
        expect(D3_E2E_IMPLEMENTATION_GAP).toContain('not fully implemented');
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.adminUserId,
            tenantRole: 'ORGUNIT_ADMIN',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await page.getByRole('button', { name: 'Close' }).click();
        await page.getByRole('button', { name: 'Confirm Close' }).click();

        await expect(page.getByTestId('connectshyft-audit-trace-chip')).toContainText(
          /actor.*org/i,
        );
        await expect(page.getByTestId('connectshyft-outbox-trace-chip')).toContainText(
          /thread.*state transition/i,
        );
      },
    );

    test.fixme(
      '[P0] refused actions display business refusal envelope guidance without success-side-effect indicators @P0',
      async ({ page }) => {
        const context = createStoryDContext();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.viewerUserId,
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Refusal:/i);
        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(
          /policy/i,
        );
        await expect(page.getByTestId('connectshyft-audit-trace-chip')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-outbox-trace-chip')).toHaveCount(0);
      },
    );

    test.fixme(
      '[P1] CLOSED outbound reopen flow renders prior/new-state lineage with thread_reopened_by_user indicator @P1',
      async ({ page }) => {
        const context = createStoryDContext();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.closed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await page.getByRole('button', { name: 'Send Message' }).click();
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
          /conversation reopened/i,
        );
        await expect(page.getByTestId('connectshyft-lifecycle-lineage-chip')).toContainText(
          /closed -> unclaimed/i,
        );
        await expect(page.getByTestId('connectshyft-lifecycle-lineage-chip')).toContainText(
          context.eventNames.reopenedByUser,
        );
      },
    );

    test.fixme(
      '[P1] feedback taxonomy stays deterministic (success/refusal/error) with plain-language operator copy @P1',
      async ({ page }) => {
        const context = createStoryDContext();
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
        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Success:/i);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.viewerUserId,
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );
        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Refusal:/i);
      },
    );
  },
);
