import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryD1Context,
  type StoryD1Context,
} from '../../support/factories/connectShyftStoryD1Factory';

const buildThreadUrl = (
  context: StoryD1Context,
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
  'Story d.1 outbound SMS/call actions that preserve escalation semantics (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] unclaimed thread detail keeps call and sms actions available while messaging escalation-continues-until-claim contract @P0',
      async ({ page }) => {
        const context = createStoryD1Context();
        await login(page);

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

        const callResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.unclaimed}/call`)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Call' }).click();
        await callResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-escalation-chip')).toContainText(
          /monitoring|escalation/i,
        );
        await expect(page.getByTestId('connectshyft-outbound-policy-notice')).toContainText(
          /continues until claim/i,
        );
      },
    );

    test.skip(
      '[P0] outbound call from CLOSED thread reopens same thread in-place and surfaces deterministic reset feedback @P0',
      async ({ page }) => {
        const context = createStoryD1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.closed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const callResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.closed}/call`)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Call' }).click();
        await callResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(
          context.threadIds.closed,
        );
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
          'Conversation reopened',
        );
        await expect(page.getByTestId('connectshyft-thread-inactivity-chip')).toContainText(/reset/i);
      },
    );

    test.skip(
      '[P1] outbound call UI exposes bridge-only transport contract and hides automatic redial controls @P1',
      async ({ page }) => {
        const context = createStoryD1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
        await page.getByRole('button', { name: 'Call' }).click();

        await expect(page.getByTestId('connectshyft-call-transport-chip')).toHaveText('Bridge call');
        await expect(page.getByTestId('connectshyft-call-retry-policy-chip')).toContainText(
          /manual retry only/i,
        );
        await expect(page.getByTestId('connectshyft-call-auto-redial-toggle')).toHaveCount(0);
      },
    );

    test.skip(
      '[P1] connected call progression auto-claims unclaimed thread and updates action matrix from claim to close @P1',
      async ({ page }) => {
        const context = createStoryD1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
          }),
        );

        const callResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.unclaimed}/call`)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Call' }).click();
        await callResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
        await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-thread-call-connected-badge')).toContainText(
          /connected and claimed/i,
        );
      },
    );

    test.skip(
      '[P1] CLOSED thread interaction keeps explicit call and send-message controls while preventing inbound auto-reopen cues @P1',
      async ({ page }) => {
        const context = createStoryD1Context();
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
        await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Send Message|Text/i })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-closed-thread-auto-reopen-banner')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-inbound-fallback-audit-chip')).toBeVisible();
      },
    );
  },
);
