import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryDContext,
  type StoryDContext,
} from '../../support/factories/connectShyftStoryDFactory';

const D4_E2E_IMPLEMENTATION_GAP =
  'Story d.4 interaction safety UX (override prompt accessibility and state-transition messaging) is not fully complete yet.';

const buildThreadUrl = (
  context: StoryDContext,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    prefersTexting?: 'YES' | 'NO';
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    prefersTexting: options.prefersTexting ?? 'YES',
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe(
  'Story d.4 operator interaction contracts for outbound safety (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] action matrix is explicit by thread state across mobile and desktop breakpoints @P0',
      async ({ page }) => {
        const context = createStoryDContext();
        expect(D4_E2E_IMPLEMENTATION_GAP).toContain('not fully complete');
        await login(page);

        for (const viewport of [
          { width: 390, height: 844 },
          { width: 1280, height: 800 },
        ]) {
          await page.setViewportSize(viewport);

          await page.goto(
            buildThreadUrl(context, {
              threadId: context.threadIds.unclaimed,
              actorUserId: context.userId,
              tenantRole: 'ORGUNIT_MEMBER',
              orgUnitMemberships: [context.orgUnitId],
            }),
          );
          await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Text' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();

          await page.goto(
            buildThreadUrl(context, {
              threadId: context.threadIds.claimed,
              actorUserId: context.userId,
              tenantRole: 'ORGUNIT_MEMBER',
              orgUnitMemberships: [context.orgUnitId],
            }),
          );
          await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();

          await page.goto(
            buildThreadUrl(context, {
              threadId: context.threadIds.closed,
              actorUserId: context.userId,
              tenantRole: 'ORGUNIT_MEMBER',
              orgUnitMemberships: [context.orgUnitId],
            }),
          );
          await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
        }
      },
    );

    test.fixme(
      '[P0] CLOSED outbound interaction shows explicit same-thread reopen transition with no hidden state change @P0',
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
          /reopened/i,
        );
      },
    );

    test.fixme(
      '[P1] prefers_texting=NO path requires accessible override input and refusal guidance before send @P1',
      async ({ page }) => {
        const context = createStoryDContext();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            prefersTexting: 'NO',
          }),
        );

        await page.getByRole('button', { name: 'Text' }).click();
        const reasonInput = page.getByTestId('connectshyft-sms-override-reason-input');
        await expect(reasonInput).toBeVisible();
        await expect(reasonInput).toHaveAttribute('aria-label', /override reason/i);
        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Refusal:/i);
      },
    );

    test.fixme(
      '[P1] keyboard/screen-reader semantics for policy banners and action controls remain deterministic and explicit @P1',
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

        await page.getByRole('button', { name: 'Call' }).focus();
        await expect
          .poll(() =>
            page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? ''),
          )
          .toBe('connectshyft-thread-action-call');

        await page.keyboard.press('Tab');
        await expect(page.getByTestId('connectshyft-live-region-status')).toHaveAttribute(
          'aria-live',
          'polite',
        );
        await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
          'role',
          'status',
        );
      },
    );
  },
);
