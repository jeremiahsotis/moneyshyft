import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryDContext,
  type StoryDContext,
} from '../../support/factories/connectShyftStoryDFactory';

const D1_E2E_IMPLEMENTATION_GAP =
  'Story d.1 outbound lifecycle UX contracts are not fully surfaced in ConnectShyft thread-detail UI yet.';

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
  'Story d.1 outbound sms/call actions that preserve escalation semantics (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] UNCLAIMED outbound actions keep state/escalation and show claim-only reset guidance @P0',
      async ({ page }) => {
        const context = createStoryDContext();
        expect(D1_E2E_IMPLEMENTATION_GAP).toContain('not fully surfaced');
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const baselineEscalation = await page
          .getByTestId('connectshyft-thread-escalation-chip')
          .textContent();

        await page.getByRole('button', { name: 'Call' }).click();
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-escalation-chip')).toHaveText(
          baselineEscalation || '',
        );
        await expect(page.getByTestId('connectshyft-thread-policy-feedback-banner')).toContainText(
          /escalation continues until claim/i,
        );
      },
    );

    test.fixme(
      '[P0] CLOSED outbound call/message reopens same thread id and exposes deterministic reopened feedback @P0',
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

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
        await page.getByRole('button', { name: 'Call' }).click();
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(
          context.threadIds.closed,
        );
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
          /conversation reopened/i,
        );
      },
    );

    test.fixme(
      '[P1] outbound call surface communicates bridge-call transport and manual retry-only policy @P1',
      async ({ page }) => {
        const context = createStoryDContext();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await page.getByRole('button', { name: 'Call' }).click();
        await expect(page.getByTestId('connectshyft-call-transport-chip')).toHaveText(/bridge/i);
        await expect(page.getByTestId('connectshyft-call-retry-policy-chip')).toContainText(
          /manual only/i,
        );
        await expect(page.getByTestId('connectshyft-call-auto-redial-indicator')).toHaveCount(0);
      },
    );

    test.fixme(
      '[P1] inbound fallback events on CLOSED thread never auto-reopen and preserve explicit intake fallback indicator @P1',
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

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
        await expect(page.getByTestId('connectshyft-closed-thread-auto-reopen-banner')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-inbound-fallback-timeline-chip')).toContainText(
          /intake fallback/i,
        );
      },
    );
  },
);
