import { test, expect } from '@playwright/test';
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

test.describe('Story ux-r4 Outbound Policy Guardrail UI (ATDD E2E)', () => {
  test(
    '[P0] lifecycle-specific action controls remain explicit and do not expose hidden policy paths @P0',
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
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-hidden-policy-action')).toHaveCount(0);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-hidden-policy-action')).toHaveCount(0);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-hidden-policy-action')).toHaveCount(0);
    },
  );

  test(
    '[P0] prefers_texting NO requires explicit override reason and blocks send until validation succeeds @P0',
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

      await page.getByRole('button', { name: /Send Message|Text/i }).click();
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-preference-override-reason-select'),
      ).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-note-input')).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-submit')).toBeDisabled();
    },
  );

  test(
    '[P0] outbound action from CLOSED thread reopens same thread to UNCLAIMED with explicit transition feedback @P0',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      const threadIdChip = page.getByTestId('connectshyft-thread-id-chip');
      const priorThreadIdText = await threadIdChip.textContent();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
      await page.getByRole('button', { name: /Send Message|Text/i }).click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /reopened/i,
      );
      if (priorThreadIdText) {
        await expect(threadIdChip).toContainText(priorThreadIdText.trim());
      }
    },
  );

  test(
    '[P1] refusal envelope mapping renders deterministic accessible policy-specific feedback @P1',
    async ({ page }) => {
      const context = createStoryUxR4Context();
      await login(page);

      await page.route('**/api/v1/connectshyft/threads/*/messages', async (route) => {
        await route.fulfill({
          status: 200,
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

      await page.getByRole('button', { name: /Send Message|Text/i }).click();
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
    '[P1] success and error envelopes map to stable accessible feedback and avoid ambiguous fallback copy @P1',
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
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            code: context.envelopeCodes.error,
            data: {
              uiFeedback: {
                severity: 'error',
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

      await page.getByRole('button', { name: /Send Message|Text/i }).click();
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toContainText(
        /policy guardrails satisfied/i,
      );
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toHaveAttribute(
        'aria-live',
        'polite',
      );

      await page.getByRole('button', { name: /Send Message|Text/i }).click();
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
