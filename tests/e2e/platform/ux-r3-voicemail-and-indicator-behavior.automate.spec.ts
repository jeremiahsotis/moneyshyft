import { randomUUID } from 'node:crypto';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';

type SurfaceContext = {
  paths: {
    inboxUi: string;
    mineUi: string;
  };
  tenantId: string;
  orgUnitId: string;
  userId: string;
};

type DetailContext = {
  paths: {
    threadDetailUi: string;
  };
  tenantId: string;
  orgUnitId: string;
  userId: string;
};

const buildSurfaceUrl = (
  context: SurfaceContext,
  options: {
    bucket: 'mine' | 'inbox';
    actorUserId?: string;
    tenantRole?: string;
    orgUnitMemberships?: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId ?? context.userId,
    tenantRole: options.tenantRole ?? 'ORGUNIT_MEMBER',
    orgUnitMemberships: (options.orgUnitMemberships ?? [context.orgUnitId]).join(','),
  });

  const basePath = options.bucket === 'mine' ? context.paths.mineUi : context.paths.inboxUi;
  return `${basePath}?${params.toString()}`;
};

const buildThreadDetailUrl = (
  context: DetailContext,
  threadId: string,
  actorUserId?: string,
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: actorUserId ?? context.userId,
    tenantRole: 'ORGUNIT_MEMBER',
    orgUnitMemberships: context.orgUnitId,
  });

  return `${context.paths.threadDetailUi}/${threadId}?${params.toString()}`;
};

test.describe('Story ux-r3 automate - voicemail and indicator behavior journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[UXR3-AUTOMATE-E2E-201][P0] duplicate claimed-thread voicemail deliveries remain replay-safe and never bounce the thread into Inbox @P0',
    async ({
      page,
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      await login(page);

      const providerEventId = `evt-ux-r3-automate-e2e-dup-${randomUUID().slice(0, 8)}`;
      const providerLegId = `leg-ux-r3-automate-e2e-dup-${randomUUID().slice(0, 8)}`;
      const duplicatePayload = {
        ...storyUxR3InboundVoicemailPayload,
        providerEventId,
        providerLegId,
        threadId: storyUxR3Context.threadIds.claimedVoicemail,
        neighborId: storyUxR3Context.neighborIds.claimed,
        eventType: storyUxR3Context.events.inboundVoicemail,
      };

      const firstResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: duplicatePayload,
      });
      const duplicateResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: duplicatePayload,
      });

      expect(firstResponse.status()).toBe(200);
      expect(duplicateResponse.status()).toBe(200);

      const firstBody = await firstResponse.json();
      const duplicateBody = await duplicateResponse.json();
      expect(firstBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          replaySafe: {
            duplicate: false,
            suppressedDomainWrites: false,
            dedupeKey: expect.any(String),
          },
        },
      });
      expect(duplicateBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          replaySafe: {
            duplicate: true,
            suppressedDomainWrites: true,
            dedupeKey: firstBody?.data?.replaySafe?.dedupeKey,
          },
          sideEffects: {
            lifecycleMutationApplied: false,
            canonicalEventPersisted: false,
            outboxPersisted: false,
          },
        },
      });

      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'mine',
        }),
      );
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();

      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'inbox',
        }),
      );
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toHaveCount(0);
    },
  );

  test(
    '[UXR3-AUTOMATE-E2E-202][P1] claimed-thread voicemail ownership visibility is actor-scoped with Mine-only visibility for the owner @P1',
    async ({
      page,
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      await login(page);

      const payload = {
        ...storyUxR3InboundVoicemailPayload,
        providerEventId: `evt-ux-r3-automate-e2e-actor-${randomUUID().slice(0, 8)}`,
        providerLegId: `leg-ux-r3-automate-e2e-actor-${randomUUID().slice(0, 8)}`,
        threadId: storyUxR3Context.threadIds.claimedVoicemail,
        neighborId: storyUxR3Context.neighborIds.claimed,
        eventType: storyUxR3Context.events.inboundVoicemail,
      };

      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: payload,
      });
      expect(webhookResponse.status()).toBe(200);

      const peerActorUserId = `${storyUxR3Context.userId}-peer`;
      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'mine',
          actorUserId: storyUxR3Context.userId,
          orgUnitMemberships: [storyUxR3Context.orgUnitId],
        }),
      );
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();

      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'mine',
          actorUserId: peerActorUserId,
          orgUnitMemberships: [storyUxR3Context.orgUnitId],
        }),
      );
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toHaveCount(0);

      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'inbox',
          actorUserId: peerActorUserId,
          orgUnitMemberships: [storyUxR3Context.orgUnitId],
        }),
      );
      await expect(
        page.getByTestId(`connectshyft-thread-card-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${storyUxR3Context.threadIds.claimedVoicemail}`),
      ).toBeVisible();
    },
  );

  test(
    '[UXR3-AUTOMATE-E2E-203][P1] closed-thread inbound voicemail remains fail-closed and never reopens in thread detail @P1',
    async ({
      page,
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundClosedPayload,
    }) => {
      await login(page);

      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: {
          ...storyUxR3InboundClosedPayload,
          providerEventId: `evt-ux-r3-automate-e2e-closed-${randomUUID().slice(0, 8)}`,
          providerLegId: `leg-ux-r3-automate-e2e-closed-${randomUUID().slice(0, 8)}`,
          eventType: storyUxR3Context.events.inboundVoicemail,
        },
      });

      expect(webhookResponse.status()).toBe(200);
      const webhookBody = await webhookResponse.json();
      expect(webhookBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          threadState: 'CLOSED',
          lifecycle: {
            ensuredActiveThread: false,
            reopenedByInbound: false,
            escalationResetApplied: false,
            inactivityResetApplied: false,
          },
          timeline: {
            routingDecision: 'intake_fallback',
          },
        },
      });

      await page.goto(
        buildThreadDetailUrl(storyUxR3Context, storyUxR3Context.threadIds.closedVoice),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('Closed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.closedVoice}`,
        headers: storyUxR3AdminHeaders,
      });
      expect(detailResponse.status()).toBe(200);
      const detailBody = await detailResponse.json();
      expect(detailBody?.data?.thread?.state).toBe('CLOSED');
      expect(detailBody?.data?.thread?.lifecycle?.reopenedByInbound).toBe(false);
    },
  );

  test(
    '[UXR3-AUTOMATE-E2E-204][P2] unclaimed voicemail label remains consistent between Inbox surface and thread-detail contract across refresh @P2',
    async ({
      page,
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      await login(page);

      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: {
          ...storyUxR3InboundVoicemailPayload,
          providerEventId: `evt-ux-r3-automate-e2e-unclaimed-${randomUUID().slice(0, 8)}`,
          providerLegId: `leg-ux-r3-automate-e2e-unclaimed-${randomUUID().slice(0, 8)}`,
          threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
          neighborId: storyUxR3Context.neighborIds.unclaimed,
          eventType: storyUxR3Context.events.inboundVoicemail,
        },
      });
      expect(webhookResponse.status()).toBe(200);

      await page.goto(
        buildSurfaceUrl(storyUxR3Context, {
          bucket: 'inbox',
        }),
      );

      const labelLocator = page.getByTestId(
        `connectshyft-voicemail-label-${storyUxR3Context.threadIds.unclaimedVoicemail}`,
      );
      await expect(labelLocator).toHaveText(storyUxR3Context.expectedLabels.unclaimedVoicemail);
      const inboxLabelText = ((await labelLocator.textContent()) ?? '').trim();
      expect(inboxLabelText).toBe(storyUxR3Context.expectedLabels.unclaimedVoicemail);

      const detailResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
        headers: storyUxR3AdminHeaders,
      });
      expect(detailResponse.status()).toBe(200);
      const detailBody = await detailResponse.json();
      expect(detailBody?.data?.thread?.voicemailLabel).toBe(inboxLabelText);
      expect(detailBody?.data?.thread?.voicemailIndicator).toBe(true);

      await page.reload();
      await expect(labelLocator).toHaveText(inboxLabelText);
    },
  );
});
