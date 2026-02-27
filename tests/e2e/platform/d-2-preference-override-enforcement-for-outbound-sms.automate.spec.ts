import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryDContext,
  type StoryDContext,
} from '../../support/factories/connectShyftStoryDFactory';

const D2_E2E_IMPLEMENTATION_GAP =
  'Story d.2 override-required UX for prefers_texting=NO is not yet fully wired in thread-detail actions.';

const buildThreadUrl = (
  context: StoryDContext,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    prefersTexting: 'YES' | 'NO';
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    prefersTexting: options.prefersTexting,
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe(
  'Story d.2 preference override enforcement for outbound sms (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] prefers_texting=NO blocks SMS send until override reason is entered with explicit operator guidance @P0',
      async ({ page }) => {
        const context = createStoryDContext();
        expect(D2_E2E_IMPLEMENTATION_GAP).toContain('not yet fully wired');
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
        await expect(page.getByTestId('connectshyft-sms-override-reason-input')).toBeVisible();
        await expect(page.getByTestId('connectshyft-sms-override-submit')).toBeDisabled();
        await expect(page.getByTestId('connectshyft-thread-policy-feedback-banner')).toContainText(
          /override reason required/i,
        );
      },
    );

    test.fixme(
      '[P0] valid override reason enables send and surfaces explicit override success/audit marker @P0',
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
        await page.getByTestId('connectshyft-sms-override-reason-input').fill('safety-follow-up');
        await page.getByTestId('connectshyft-sms-override-note-input').fill('Neighbor asked for a status update.');
        await page.getByTestId('connectshyft-sms-override-submit').click();

        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Success:/i);
        await expect(page.getByTestId('connectshyft-thread-override-chip')).toContainText(
          /override: safety-follow-up/i,
        );
      },
    );

    test.fixme(
      '[P1] invalid override values render deterministic refusal guidance and no outbound message append @P1',
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
        await page.getByTestId('connectshyft-sms-override-reason-input').fill('x');
        await page.getByTestId('connectshyft-sms-override-submit').click();

        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(/^Refusal:/i);
        await expect(page.getByTestId('connectshyft-feedback-banner')).toContainText(
          /provide a valid override reason/i,
        );
        await expect(page.getByTestId('connectshyft-thread-message-outbound-row')).toHaveCount(0);
      },
    );

    test.fixme(
      '[P1] CLOSED-thread SMS first reopens in-place and then shows override-required prompt before dispatch @P1',
      async ({ page }) => {
        const context = createStoryDContext();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.closed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            prefersTexting: 'NO',
          }),
        );

        await page.getByRole('button', { name: 'Send Message' }).click();
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
          /conversation reopened/i,
        );
        await expect(page.getByTestId('connectshyft-sms-override-reason-input')).toBeVisible();
      },
    );
  },
);
