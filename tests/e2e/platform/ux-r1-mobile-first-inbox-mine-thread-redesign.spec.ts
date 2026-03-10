import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryUxR1Context,
  type StoryUxR1Context,
} from '../../support/factories/connectShyftStoryUxR1Factory';

const UX_R1_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const UX_R1_FORBIDDEN_COPY = [
  'capability status',
  'search and open deterministic connectshyft queue work',
  'last inbound number',
  'preferred outbound number',
  'thread detail',
] as const;

const buildSurfaceUrl = (
  context: StoryUxR1Context,
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
  context: StoryUxR1Context,
  options: {
    threadId: string;
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

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

const expectVolunteerFacingCopy = async (copy: string): Promise<void> => {
  const loweredCopy = copy.toLowerCase();

  for (const forbiddenToken of UX_R1_FORBIDDEN_COPY) {
    expect(loweredCopy).not.toContain(forbiddenToken);
  }

  expect(loweredCopy).not.toMatch(UX_R1_UUID_PATTERN);
};

test.describe('Story ux-r1 automate - mobile-first inbox/mine/thread operator journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[P0] persistent bottom navigation keeps Inbox Mine More visible without hidden fourth primary tab @P0',
    async ({ page }) => {
      const context = createStoryUxR1Context();
      await login(page);

      const inboxRequest = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/connectshyft/inbox')
          && response.request().method() === 'GET',
      );

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await inboxRequest;

      await expect(page.getByTestId('connectshyft-bottom-nav')).toBeVisible();
      await expect(page.getByTestId('connectshyft-bottom-nav-inbox')).toBeVisible();
      await expect(page.getByTestId('connectshyft-bottom-nav-mine')).toBeVisible();
      await expect(page.getByTestId('connectshyft-bottom-nav-more')).toBeVisible();
      await expect(page.getByTestId('connectshyft-bottom-nav-hidden-primary-tab')).toHaveCount(0);

      await page.getByTestId('connectshyft-bottom-nav-more').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/more/);
      await expect(page.getByRole('heading', { name: 'ConnectShyft More' })).toBeVisible();

      await page.getByTestId('connectshyft-bottom-nav-mine').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/mine/);
      await page.getByTestId('connectshyft-bottom-nav-inbox').click();
      await expect(page).toHaveURL(/\/app\/connectshyft\/inbox/);
    },
  );

  test(
    '[P0] inbox and mine cards enforce large-card readability with >=16px body text and >=44px primary tap targets @P0',
    async ({ page }) => {
      const context = createStoryUxR1Context();
      await login(page);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'inbox',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      const inboxBodyText = page.getByTestId('connectshyft-thread-card-body').first();
      const inboxPrimaryAction = page.getByTestId('connectshyft-thread-card-primary-action').first();
      const inboxFontSize = await inboxBodyText.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).fontSize),
      );
      const inboxTapTargetHeight = await inboxPrimaryAction.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).minHeight),
      );
      const inboxCopy = (await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? '';

      expect(inboxFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(inboxTapTargetHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);
      await expect(page.getByTestId('connectshyft-inbox-summary-copy')).toContainText(
        /neighbor.*follow-up/i,
      );
      await expect(page.getByTestId('connectshyft-queue-search-input')).toHaveAttribute(
        'placeholder',
        'Search neighbors',
      );
      await expectVolunteerFacingCopy(inboxCopy);

      await page.goto(
        buildSurfaceUrl(context, {
          bucket: 'mine',
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );

      const mineBodyText = page.getByTestId('connectshyft-thread-card-body').first();
      const minePrimaryAction = page.getByTestId('connectshyft-thread-card-primary-action').first();
      const mineFontSize = await mineBodyText.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).fontSize),
      );
      const mineTapTargetHeight = await minePrimaryAction.evaluate((element) =>
        Number.parseFloat(window.getComputedStyle(element).minHeight),
      );
      const mineCopy = (await page.getByTestId('connectshyft-inbox-surface').textContent()) ?? '';

      expect(mineFontSize).toBeGreaterThanOrEqual(context.readability.minBodyTextPx);
      expect(mineTapTargetHeight).toBeGreaterThanOrEqual(context.readability.minTapTargetPx);
      await expect(page.getByTestId('connectshyft-inbox-summary-copy')).toContainText(
        /follow-up/i,
      );
      await expectVolunteerFacingCopy(mineCopy);
    },
  );

  test(
    '[P0] thread detail prioritizes neighbor and conference context while preserving exact state action matrix @P0',
    async ({ page }) => {
      const context = createStoryUxR1Context();
      await login(page);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.unclaimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByTestId('connectshyft-thread-primary-context-panel')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-neighbor')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-conference')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-context-claim')).toBeVisible();
      await expect(page.getByTestId('connectshyft-neighbor-snapshot')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-timeline')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-header-neighbor-context')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-header-conference-context')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible();
      const unclaimedCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
      await expectVolunteerFacingCopy(unclaimedCopy);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.claimed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
      const claimedCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
      await expectVolunteerFacingCopy(claimedCopy);

      await page.goto(
        buildThreadDetailUrl(context, {
          threadId: context.threadIds.closed,
          actorUserId: context.userId,
          tenantRole: 'ORGUNIT_MEMBER',
        }),
      );
      await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
      await expect(page.getByTestId('connectshyft-send-message-thread-action')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
      const closedCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
      await expectVolunteerFacingCopy(closedCopy);
    },
  );

  test(
    '[P1] responsive breakpoints preserve context voicemail indicators and action discoverability without hidden policy paths @P1',
    async ({ page }) => {
      const context = createStoryUxR1Context();
      await login(page);

      const viewports = [
        { label: 'mobile', width: 390, height: 844 },
        { label: 'tablet', width: 834, height: 1112 },
        { label: 'desktop', width: 1280, height: 800 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const detailRequest = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${context.threadIds.voicemailClaimed}`)
            && response.request().method() === 'GET',
        );
        await page.goto(
          buildThreadDetailUrl(context, {
            threadId: context.threadIds.voicemailClaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
          }),
        );
        await detailRequest;

        await expect(page.getByTestId('connectshyft-thread-header-neighbor-context')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-header-conference-context')).toBeVisible();
        await expect(page.getByTestId('connectshyft-voicemail-indicator')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-actions')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-timeline-event-voicemail').first()).toBeVisible();
        const actionLabels = (await page
          .getByTestId('connectshyft-thread-actions')
          .locator('button')
          .allTextContents())
          .map((value) => value.trim());
        expect(actionLabels).toContain('Call');
        expect(actionLabels).toContain('Close');
        expect(actionLabels.some((label) => label === 'Text' || label === 'Send Message')).toBe(
          true,
        );
        const viewportCopy = (await page.getByTestId('connectshyft-thread-surface').textContent()) ?? '';
        await expectVolunteerFacingCopy(viewportCopy);

        await test.step(`action discoverability remains explicit on ${viewport.label}`, async () => {
          await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
          const sendMessageAction = page.getByTestId('connectshyft-send-message-thread-action');
          if ((await sendMessageAction.count()) > 0) {
            await expect(sendMessageAction).toBeVisible();
          } else {
            await expect(page.getByTestId('connectshyft-send-text-thread-action')).toBeVisible();
          }
          await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Claim' })).toHaveCount(0);
          await expect(page.getByRole('button', { name: 'Take Over' })).toHaveCount(0);
        });
      }
    },
  );
});
