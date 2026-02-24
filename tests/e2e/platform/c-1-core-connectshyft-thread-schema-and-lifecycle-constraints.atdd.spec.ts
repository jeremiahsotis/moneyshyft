import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC1Context,
  type StoryC1Context,
} from '../../support/factories/connectShyftStoryC1Factory';

const buildInboxUrl = (context: StoryC1Context, actorUserId: string): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
    actorUserId,
  });

  return `${context.paths.inboxUi}?${params.toString()}`;
};

test.describe(
  'Story c.1 Core ConnectShyft Thread Schema and Lifecycle Constraints (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] inbox thread card renders canonical UNCLAIMED state with required number metadata after first-touch create flow @P0',
      async ({ page }) => {
        const context = createStoryC1Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId));

        await expect(page.getByRole('heading', { name: 'ConnectShyft Inbox' })).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-card')).toContainText('UNCLAIMED');
        await expect(page.getByTestId('connectshyft-thread-last-inbound-number')).toContainText(
          context.inboundCsNumberId,
        );
        await expect(page.getByTestId('connectshyft-thread-preferred-outbound-number')).toContainText(
          context.preferredOutboundCsNumberId,
        );
      },
    );

    test.skip(
      '[P1] duplicate open attempts from refresh and quick-repeat interactions keep a single active thread card for the same neighbor tuple @P1',
      async ({ page }) => {
        const context = createStoryC1Context();
        await login(page);

        await page.goto(buildInboxUrl(context, context.userId));
        await page.getByRole('button', { name: 'Open Conversation' }).click();
        await page.reload();
        await page.getByRole('button', { name: 'Open Conversation' }).click();

        await expect(page.getByTestId('connectshyft-thread-card')).toHaveCount(1);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      },
    );
  },
);
