import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryD2Context,
  type StoryD2Context,
} from '../../support/factories/connectShyftStoryD2Factory';

const buildThreadUrl = (
  context: StoryD2Context,
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

test.describe('Story d.2 Preference Override Enforcement for Outbound SMS (ATDD E2E RED)', () => {
  test.skip(
    '[P0] prefers_texting NO requires explicit override reason before outbound sms action can be submitted @P0',
    async ({ page }) => {
      const context = createStoryD2Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByRole('button', { name: /Text|Send Message/i })).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-required-chip')).toContainText(
        /override required/i,
      );
      await page.getByRole('button', { name: /Text|Send Message/i }).click();
      await expect(
        page.getByTestId('connectshyft-preference-override-modal'),
      ).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-preference-override-reason-select'),
      ).toBeVisible();
    },
  );

  test.skip(
    '[P0] missing or invalid override reason keeps send disabled and presents deterministic refusal guidance @P0',
    async ({ page }) => {
      const context = createStoryD2Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByRole('button', { name: /Text|Send Message/i }).click();
      await page.getByTestId('connectshyft-preference-override-note-input').fill('');

      await expect(
        page.getByTestId('connectshyft-preference-override-submit'),
      ).toBeDisabled();
      await expect(
        page.getByTestId('connectshyft-preference-override-error'),
      ).toContainText(/reason is required/i);
      await expect(
        page.getByTestId('connectshyft-policy-refusal-banner'),
      ).toContainText(/override reason/i);
    },
  );

  test.skip(
    '[P1] valid override reason submits outbound sms and surfaces explicit policy exception audit feedback @P1',
    async ({ page }) => {
      const context = createStoryD2Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.unclaimedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await page.getByRole('button', { name: /Text|Send Message/i }).click();
      await page
        .getByTestId('connectshyft-preference-override-reason-select')
        .selectOption('SAFETY_EXCEPTION');
      await page.getByTestId('connectshyft-preference-override-note-input').fill(
        'Safety escalation requires policy override for SMS outreach.',
      );

      await page.getByTestId('connectshyft-preference-override-submit').click();

      await expect(
        page.getByTestId('connectshyft-policy-success-banner'),
      ).toContainText(/override applied/i);
      await expect(
        page.getByTestId('connectshyft-preference-override-audit-chip'),
      ).toContainText(/safety_exception/i);
    },
  );

  test.skip(
    '[P1] closed-thread outbound sms flow reveals reopen transition before enforcing override requirements @P1',
    async ({ page }) => {
      const context = createStoryD2Context();
      await login(page);

      await page.goto(
        buildThreadUrl(context, {
          threadId: context.threadIds.closedPrefersNo,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        }),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLOSED');
      await page.getByRole('button', { name: /Send Message|Text/i }).click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(
        /conversation reopened/i,
      );
      await expect(
        page.getByTestId('connectshyft-preference-override-modal'),
      ).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-preference-override-required-chip'),
      ).toContainText(/override required/i);
    },
  );
});
