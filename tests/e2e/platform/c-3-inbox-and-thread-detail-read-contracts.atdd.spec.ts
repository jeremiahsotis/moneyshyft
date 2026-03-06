import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryC3Context,
  type StoryC3Context,
} from '../../support/factories/connectShyftStoryC3Factory';

const buildBucketUrl = (
  context: StoryC3Context,
  options: {
    bucket: 'inbox' | 'mine';
    actorUserId: string;
    tenantRole: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: context.orgUnitId,
  });

  const basePath = options.bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${basePath}?${params.toString()}`;
};

const buildThreadDetailUrl = (
  context: StoryC3Context,
  threadId: string,
  actorUserId: string,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${threadId}?${params.toString()}`;
};

test.describe('Story c.3 Inbox and Thread Detail Read Contracts (ATDD E2E RED)', () => {
  test.skip(
    '[P0] inbox list renders deterministic ordering with urgency labels mapped to operator language @P0',
    async ({ page }) => {
      const context = createStoryC3Context();
      await login(page);

      await page.goto(
        buildBucketUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await expect(page.getByTestId('connectshyft-inbox-list')).toBeVisible();
      await expect(page.getByTestId('connectshyft-inbox-item-priority-rank').first()).toHaveText('1');
      await expect(page.getByText(context.urgencyLabels.stage1)).toBeVisible();
      await expect(page.getByText(context.urgencyLabels.stage2Plus)).toBeVisible();
    },
  );

  test.skip(
    '[P0] voicemail received on claimed thread keeps card in mine and surfaces voicemail indicator without inbox bounce @P0',
    async ({ page }) => {
      const context = createStoryC3Context();
      await login(page);

      await page.goto(
        buildBucketUrl(context, {
          bucket: 'mine',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      await expect(
        page.getByTestId(`connectshyft-thread-card-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.voicemailClaimed}`),
      ).toBeVisible();
      await expect(page.getByTestId('connectshyft-inbox-moved-banner')).toHaveCount(0);
    },
  );

  test.skip(
    '[P1] thread detail renders exact action controls by state for UNCLAIMED CLAIMED and CLOSED contracts @P1',
    async ({ page }) => {
      const context = createStoryC3Context();
      await login(page);

      await page.goto(
        buildThreadDetailUrl(context, context.threadIds.unclaimed, context.userId),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Text' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();

      await page.goto(
        buildThreadDetailUrl(context, context.threadIds.claimed, context.userId),
      );
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();

      await page.goto(
        buildThreadDetailUrl(context, context.threadIds.closed, context.userId),
      );
      await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
    },
  );
});
