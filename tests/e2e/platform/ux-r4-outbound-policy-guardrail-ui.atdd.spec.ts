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

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD E2E)', () => {
  test(
    '[UXR4-ATDD-E2E-001][P0] lifecycle-specific action controls remain explicit and do not expose hidden policy paths @P0',
    async ({ page }) => {
      const context = createStoryUxR4Context();
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
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
      await expectThreadActions(page, ['Call', 'Text', 'Claim']);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expectThreadActions(page, ['Call', 'Text', 'Close']);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-message-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expectThreadActions(page, ['Call', 'Send Message']);
    },
  );

  test(
    '[UXR4-ATDD-E2E-002][P0] prefers_texting NO requires explicit override reason and blocks send until validation succeeds @P0',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

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
      await expect(
        page.getByTestId('connectshyft-preference-override-reason-select'),
      ).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-note-input')).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-submit')).toBeDisabled();
    },
  );

  test(
    '[UXR4-ATDD-E2E-003][P0] outbound action from CLOSED thread reopens same thread to UNCLAIMED with explicit transition feedback @P0',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          // Use a dedicated CLOSED fixture thread for mutation to reduce cross-test coupling.
          threadId: context.threadIds.closedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Closed');
      await page.getByTestId('connectshyft-send-message-thread-action').click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /reopened/i,
      );
      await expect(page).toHaveURL(
        new RegExp(`/app/connectshyft/threads/${context.threadIds.closedPrefersNo}`),
      );
    },
  );

  test(
    '[UXR4-ATDD-E2E-004][P1] refusal envelope mapping renders deterministic accessible policy-specific feedback @P1',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      await page.route('**/api/v1/connectshyft/threads/*/messages', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            code: context.refusalCodes.overrideRequired,
            refusalType: 'business',
            message: 'Override reason is required before sending SMS.',
            data: {
              preferencePolicy: {
                overrideRequired: true,
              },
              uiFeedback: {
                severity: 'warning',
                ariaLive: 'assertive',
                messageKey: 'connectshyft.outbound.refusal',
                message: 'Override reason is required before sending SMS.',
              },
            },
          }),
        });
      });

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toContainText(
        /override reason/i,
      );
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveAttribute(
        'aria-live',
        'assertive',
      );
    },
  );

  test(
    '[UXR4-ATDD-E2E-005][P1] success and error envelopes map to stable accessible feedback and avoid ambiguous fallback copy @P1',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      let dispatchAttempts = 0;
      await page.route('**/api/v1/connectshyft/threads/*/messages', async (route) => {
        dispatchAttempts += 1;
        if (dispatchAttempts === 1) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: true,
              code: context.envelopeCodes.success,
              data: {
                uiFeedback: {
                  severity: 'success',
                  ariaLive: 'polite',
                  messageKey: 'connectshyft.outbound.success',
                  message: 'Message sent with policy guardrails satisfied.',
                },
              },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            code: 'CONNECTSHYFT_PROVIDER_DISPATCH_FAILED',
            message: 'Unable to send message because policy guardrail validation failed.',
            errorType: 'system',
            data: {
              uiFeedback: {
                severity: 'warning',
                ariaLive: 'assertive',
                messageKey: 'connectshyft.outbound.error',
                message: 'Unable to send message because policy guardrail validation failed.',
                fallbackCopyUsed: false,
              },
            },
          }),
        });
      });

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toContainText(
        /policy guardrails satisfied/i,
      );
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toHaveAttribute(
        'aria-live',
        'polite',
      );

      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-policy-error-banner')).toContainText(
        /policy guardrail validation failed/i,
      );
      await expect(page.getByTestId('connectshyft-policy-error-banner')).toHaveAttribute(
        'aria-live',
        'assertive',
      );
      await expect(page.getByTestId('connectshyft-policy-error-banner')).not.toContainText(
        /something went wrong/i,
      );
    },
  );
});
