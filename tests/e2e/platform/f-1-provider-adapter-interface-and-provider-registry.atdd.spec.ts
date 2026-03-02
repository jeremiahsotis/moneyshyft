import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryF1Context,
  type StoryF1Context,
} from '../../support/factories/connectShyftStoryF1Factory';

const buildThreadUrl = (
  context: StoryF1Context,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    providerKey: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    providerKey: options.providerKey,
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe(
  'Story f.1 Provider Adapter Interface and Provider Registry (ATDD E2E RED)',
  () => {
    test(
      '[P0] thread detail surfaces deterministic provider resolution for outbound actions without provider-specific branching hints @P0',
      async ({ page }) => {
        const context = createStoryF1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.enabledPrimary,
          }),
        );

        await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Send Message|Text/i })).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');

        await page.getByRole('button', { name: 'Call' }).click();

        await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
          'data-feedback-taxonomy',
          'success',
        );
        await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
      },
    );

    test(
      '[P0] disabled provider refusal path remains explicit actionable and confirms no hidden lifecycle mutation in operator UI @P0',
      async ({ page }) => {
        const context = createStoryF1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.claimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.disabled,
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
        await page.getByRole('button', { name: 'Call' }).click();

        await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toContainText(
          /disabled|not registered/i,
        );
        await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
          'data-feedback-taxonomy',
          'refusal',
        );
        await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('CLAIMED');
      },
    );

    test(
      '[P1] missing provider refusal from send-message action includes operator remediation guidance and stable state evidence @P1',
      async ({ page }) => {
        const context = createStoryF1Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.missing,
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
        await page.getByRole('button', { name: /Send Message|Text/i }).click();

        await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toContainText(
          /unavailable|not registered|provider/i,
        );
        await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
          'data-feedback-taxonomy',
          'refusal',
        );
        await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      },
    );
  },
);
