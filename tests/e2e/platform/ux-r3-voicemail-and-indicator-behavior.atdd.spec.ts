import { login } from '../../helpers/auth';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';

const buildSurfaceUrl = (
  context: {
    paths: { mineUi: string; inboxUi: string };
    tenantId: string;
    orgUnitId: string;
    userId: string;
  },
  bucket: 'mine' | 'inbox',
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
    bucket,
  });

  const path = bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${path}?${params.toString()}`;
};

const buildThreadDetailUrl = (
  context: {
    paths: { threadDetailUi: string };
    tenantId: string;
    orgUnitId: string;
    userId: string;
  },
  threadId: string,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${threadId}?${params.toString()}`;
};

test.describe('Story ux-r3 Voicemail and Indicator Behavior (ATDD E2E RED)', () => {
  test.skip(
    '[P0] claimed-thread voicemail remains on Mine surface and exposes voicemail indicator without Inbox bounce @P0',
    async ({ page, storyUxR3Context }) => {
      await login(page);

      await page.goto(buildSurfaceUrl(storyUxR3Context, 'mine'));
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();

      await page.goto(buildSurfaceUrl(storyUxR3Context, 'inbox'));
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toHaveCount(0);
    },
  );

  test.skip(
    '[P0] unclaimed-thread voicemail remains in Inbox with voicemail-received labeling @P0',
    async ({ page, storyUxR3Context }) => {
      await login(page);

      await page.goto(buildSurfaceUrl(storyUxR3Context, 'inbox'));
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
      ).toBeVisible();
      await expect(
        page.getByText(storyUxR3Context.expectedLabels.unclaimedVoicemail, { exact: false }),
      ).toBeVisible();
    },
  );

  test.skip(
    '[P1] voicemail-only events preserve escalation and inactivity timer render states in thread detail @P1',
    async ({
      page,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      await login(page);

      const webhookResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
        headers: storyUxR3AdminHeaders,
        data: storyUxR3InboundVoicemailPayload,
      });
      expect(webhookResponse.status()).toBe(200);

      await page.goto(
        buildThreadDetailUrl(storyUxR3Context, storyUxR3Context.threadIds.unclaimedVoicemail),
      );
      await expect(page.getByTestId('connectshyft-escalation-stage')).toHaveAttribute(
        'data-reset-applied',
        'false',
      );
      await expect(page.getByTestId('connectshyft-inactivity-timer')).toHaveAttribute(
        'data-reset-applied',
        'false',
      );
    },
  );

  test.skip(
    '[P0] closed-thread inbound voice events preserve CLOSED state and show locked fallback treatment @P0',
    async ({
      page,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundClosedPayload,
    }) => {
      await login(page);

      const webhookResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
        headers: storyUxR3AdminHeaders,
        data: storyUxR3InboundClosedPayload,
      });
      expect(webhookResponse.status()).toBe(200);

      await page.goto(
        buildThreadDetailUrl(storyUxR3Context, storyUxR3Context.threadIds.closedVoice),
      );
      await expect(page.getByTestId('connectshyft-thread-state-badge')).toContainText('Closed');
      await expect(page.getByTestId('connectshyft-voice-fallback-banner')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-reopened-banner')).toHaveCount(0);
    },
  );
});
