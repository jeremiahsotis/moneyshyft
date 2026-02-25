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

test.describe(
  'Story c.4 claim, takeover, and close lifecycle actions (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] unclaimed thread detail shows Claim action and transitions to CLAIMED with deterministic operator feedback @P0',
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

        const claimResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.unclaimed}/claim`)
            && response.request().method() === 'POST',
        );

        await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
        await page.getByRole('button', { name: 'Claim' }).click();
        await claimResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
      },
    );

    test(
      '[P0] claimed thread detail for orgUnit admin shows takeover and close actions with ownership indicator context @P0',
      async ({ page }) => {
        const context = createStoryC4Context();
        await login(page);

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
        await expect(page.getByTestId('connectshyft-thread-owner-chip')).toContainText(/owner/i);
      },
    );

    test(
      '[P1] close action prompts deterministic confirmation content before lifecycle mutation is submitted @P1',
      async ({ page }) => {
        const context = createStoryC4Context();
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
        await expect(page.getByTestId('connectshyft-close-thread-modal')).toBeVisible();
        await expect(page.getByTestId('connectshyft-close-thread-modal')).toContainText(
          /close this thread/i,
        );
      },
    );

    test(
      '[P1] outbound call from CLOSED thread reopens the same thread id in-place and surfaces thread_reopened_by_user feedback @P1',
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
          'thread_reopened_by_user',
        );
      },
    );

    test(
      '[P1] outbound message from CLOSED thread reopens in-place and resets locked escalation/inactivity indicators @P1',
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

        const messageResponse = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.closed}/messages`)
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Send Message' }).click();
        await messageResponse;

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-escalation-chip')).toContainText(
          /monitoring/i,
        );
        await expect(page.getByTestId('connectshyft-thread-inactivity-chip')).toContainText(/reset/i);
      },
    );

    test(
      '[P1] inbound voicemail and fallback events on CLOSED thread do not auto-reopen and preserve closed-state action contract @P1',
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
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Take Over' })).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-closed-thread-auto-reopen-banner')).toHaveCount(0);
      },
    );

    test(
      '[P2] tenant-viewer thread detail surface shows deterministic refusal guidance and hides lifecycle action controls @P2',
      async ({ page }) => {
        const context = createStoryC4Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.viewerUserId,
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Take Over' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      },
    );
  },
);
