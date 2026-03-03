import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';

test.describe('Story ux-r3 Voicemail and Indicator Behavior (ATDD API RED)', () => {
  test.skip(
    '[P0] voicemail on claimed threads remains in Mine with voicemail indicator and never reclassifies into Inbox @P0',
    async ({
      request,
      storyUxR3Context,
      storyUxR3MemberHeaders,
      storyUxR3InboxQuery,
      storyUxR3MineQuery,
    }) => {
      const mineResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.inbox}${storyUxR3MineQuery}`,
        headers: storyUxR3MemberHeaders,
      });
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
        headers: storyUxR3MemberHeaders,
      });

      expect(mineResponse.status()).toBe(200);
      expect(inboxResponse.status()).toBe(200);

      const mineBody = await mineResponse.json();
      const inboxBody = await inboxResponse.json();

      const mineThread = (mineBody?.data?.items ?? []).find(
        (item: { threadId?: string }) => item.threadId === storyUxR3Context.threadIds.claimedVoicemail,
      );
      const inboxThread = (inboxBody?.data?.items ?? []).find(
        (item: { threadId?: string }) => item.threadId === storyUxR3Context.threadIds.claimedVoicemail,
      );

      expect(mineThread).toMatchObject({
        threadId: storyUxR3Context.threadIds.claimedVoicemail,
        state: 'CLAIMED',
        bucket: 'mine',
        voicemailIndicator: true,
      });
      expect(inboxThread).toBeUndefined();
    },
  );

  test.skip(
    '[P0] voicemail on unclaimed threads remains in Inbox and carries voicemail-received labeling @P0',
    async ({ request, storyUxR3Context, storyUxR3MemberHeaders, storyUxR3InboxQuery }) => {
      const inboxResponse = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
        headers: storyUxR3MemberHeaders,
      });

      expect(inboxResponse.status()).toBe(200);
      const inboxBody = await inboxResponse.json();

      const voicemailThread = (inboxBody?.data?.items ?? []).find(
        (item: { threadId?: string }) => item.threadId === storyUxR3Context.threadIds.unclaimedVoicemail,
      );

      expect(voicemailThread).toMatchObject({
        threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
        state: 'UNCLAIMED',
        bucket: 'inbox',
        voicemailIndicator: true,
        voicemailLabel: storyUxR3Context.expectedLabels.unclaimedVoicemail,
      });
    },
  );

  test.skip(
    '[P1] voicemail-only and missed-inbound events preserve escalation and inactivity windows without lifecycle reset @P1',
    async ({
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundVoicemailPayload,
    }) => {
      const detailBefore = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
        headers: storyUxR3AdminHeaders,
      });

      expect(detailBefore.status()).toBe(200);
      const detailBeforeBody = await detailBefore.json();
      const beforeStage = detailBeforeBody?.data?.thread?.escalation?.stage;
      const beforeNextEvaluation = detailBeforeBody?.data?.thread?.nextEvaluationAtUtc;

      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: storyUxR3InboundVoicemailPayload,
      });

      expect(webhookResponse.status()).toBe(200);
      const webhookBody = await webhookResponse.json();
      expect(webhookBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          lifecycle: {
            reopenedByInbound: false,
            escalationResetApplied: false,
            inactivityResetApplied: false,
          },
        },
      });

      const detailAfter = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
        headers: storyUxR3AdminHeaders,
      });

      expect(detailAfter.status()).toBe(200);
      const detailAfterBody = await detailAfter.json();
      expect(detailAfterBody?.data?.thread?.escalation?.stage).toBe(beforeStage);
      expect(detailAfterBody?.data?.thread?.nextEvaluationAtUtc).toBe(beforeNextEvaluation);
    },
  );

  test.skip(
    '[P0] closed-thread inbound voice events route to locked fallback and do not auto-reopen thread state @P0',
    async ({
      request,
      storyUxR3Context,
      storyUxR3AdminHeaders,
      storyUxR3InboundClosedPayload,
    }) => {
      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyUxR3Context.paths.inboundWebhook,
        headers: storyUxR3AdminHeaders,
        data: storyUxR3InboundClosedPayload,
      });

      expect(webhookResponse.status()).toBe(200);
      const webhookBody = await webhookResponse.json();
      expect(webhookBody).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
        data: {
          thread: {
            threadId: storyUxR3Context.threadIds.closedVoice,
            state: 'CLOSED',
          },
          lifecycle: {
            reopenedByInbound: false,
          },
          timeline: {
            routingDecision: 'intake_fallback',
          },
        },
      });

      const detailAfter = await apiRequest(request, {
        method: 'GET',
        path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.closedVoice}`,
        headers: storyUxR3AdminHeaders,
      });

      expect(detailAfter.status()).toBe(200);
      const detailAfterBody = await detailAfter.json();
      expect(detailAfterBody?.data?.thread?.state).toBe('CLOSED');
    },
  );
});
