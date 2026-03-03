import { randomUUID } from 'node:crypto';
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
  test(
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

  test(
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
        page.getByTestId(`connectshyft-voicemail-label-${storyUxR3Context.threadIds.unclaimedVoicemail}`),
      ).toHaveText(storyUxR3Context.expectedLabels.unclaimedVoicemail);
    },
  );

  test(
    '[P1] voicemail-only events preserve escalation and inactivity timer render states in thread detail @P1',
    async ({
      page,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      await login(page);

      const detailUrl = buildThreadDetailUrl(
        storyUxR3Context,
        storyUxR3Context.threadIds.unclaimedVoicemail,
      );
      await page.goto(detailUrl);
      const escalationChip = page.getByTestId('connectshyft-thread-escalation-chip');
      const inactivityChip = page.getByTestId('connectshyft-thread-inactivity-chip');
      const baselineEscalationLabel = (await escalationChip.textContent())?.trim();

      const webhookResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
        headers: storyUxR3AdminHeaders,
        data: storyUxR3InboundVoicemailPayload,
      });
      expect(webhookResponse.status()).toBe(200);

      await page.goto(detailUrl);
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(escalationChip).toHaveText(baselineEscalationLabel || 'Needs urgent attention');
      await expect(inactivityChip).toContainText(/stable/i);

      const missedInboundResponse = await page.request.post(storyUxR3Context.paths.inboundWebhook, {
        headers: storyUxR3AdminHeaders,
        data: {
          ...storyUxR3InboundVoicemailPayload,
          providerEventId: `evt-ux-r3-e2e-missed-${randomUUID().slice(0, 8)}`,
          providerLegId: `leg-ux-r3-e2e-missed-${randomUUID().slice(0, 8)}`,
          eventType: storyUxR3Context.events.inboundMissedCall,
        },
      });
      expect(missedInboundResponse.status()).toBe(200);

      await page.goto(detailUrl);
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('UNCLAIMED');
      await expect(escalationChip).toHaveText(baselineEscalationLabel || 'Needs urgent attention');
      await expect(inactivityChip).toContainText(/stable/i);
    },
  );

  test(
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
      const webhookBody = await webhookResponse.json();
      expect(webhookBody?.data?.timeline?.routingDecision).toBe('intake_fallback');

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('CLOSED');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
    },
  );
});
