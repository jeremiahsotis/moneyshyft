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

test.describe(
  'Story c.3 automate - inbox and thread detail read contracts operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] inbox list shows deterministic priority ordering and plain-language urgency labels for operators @P0',
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
        await expect(
          page.getByTestId(`connectshyft-thread-card-${context.threadIds.claimed}`),
        ).toBeVisible();
        await expect.poll(
          async () => page
            .locator('[data-testid^="connectshyft-thread-card-"]')
            .evaluateAll((nodes) => nodes
              .map((node) => node.getAttribute('data-testid') || '')
              .filter((value) => value.length > 0)
              .map((value) => value.replace('connectshyft-thread-card-', ''))),
        ).toEqual([
          context.threadIds.claimed,
          context.threadIds.unclaimed,
          'thread-c3-unclaimed-1006',
          context.threadIds.closed,
          'thread-c3-new-unread-1005',
        ]);

        await expect.poll(
          async () => (await page
            .getByTestId('connectshyft-inbox-item-priority-rank')
            .allTextContents())
            .map((value) => value.trim()),
        ).toEqual(['1', '2', '2', '3', '4']);

        await expect(page.getByText(context.urgencyLabels.stage1)).toBeVisible();
        await expect(page.getByText(context.urgencyLabels.stage2Plus).first()).toBeVisible();
      },
    );

    test(
      '[P0] claimed voicemail thread stays in Mine with voicemail indicator and no forced inbox relocation banner @P0',
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

    test(
      '[P1] thread detail action controls match canonical UNCLAIMED CLAIMED and CLOSED contract sets @P1',
      async ({ page }) => {
        const context = createStoryC3Context();
        await login(page);

        await page.goto(buildThreadDetailUrl(context, context.threadIds.unclaimed, context.userId));
        await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Text' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();

        await page.goto(buildThreadDetailUrl(context, context.threadIds.claimed, context.userId));
        await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);

        await page.goto(buildThreadDetailUrl(context, context.threadIds.closed, context.userId));
        await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      },
    );

    test(
      '[P1] thread detail renders outbound-context metadata while hiding raw escalation stage internals @P1',
      async ({ page }) => {
        const context = createStoryC3Context();
        await login(page);

        await page.goto(buildThreadDetailUrl(context, context.threadIds.claimed, context.userId));

        await expect(page.getByTestId('connectshyft-thread-metadata-last-inbound-number')).toContainText(
          /cs-number/i,
        );
        await expect(page.getByTestId('connectshyft-thread-metadata-preferred-outbound-number')).toContainText(
          /cs-number/i,
        );
        await expect(page.getByTestId('connectshyft-thread-detail')).not.toContainText(/stage\s*\d+/i);
      },
    );
  },
);
