import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryUxR3Headers } from '../../support/factories/connectShyftStoryUxR3Factory';
import { test, expect } from '../../support/fixtures/connectShyftStoryUxR3.fixture';
import { hasRequiredEnvelopeKeys } from '../../support/helpers/connectShyftWebhookTestHelpers';

type ThreadSummary = {
  threadId?: string;
  state?: string;
  bucket?: string;
  voicemailIndicator?: boolean;
  voicemailLabel?: string | null;
};

const findThreadSummary = (
  items: unknown,
  threadId: string,
): ThreadSummary | undefined => {
  if (!Array.isArray(items)) {
    return undefined;
  }

  return items.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }
    return (candidate as { threadId?: unknown }).threadId === threadId;
  }) as ThreadSummary | undefined;
};

test.describe(
  'Story ux-r3 automate - voicemail and indicator behavior API coverage expansion',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] duplicate claimed voicemail webhook deliveries are replay-safe and suppress duplicate side effects while preserving Mine ownership context @P0',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3MemberHeaders,
        storyUxR3MineQuery,
        storyUxR3InboundVoicemailPayload,
      }) => {
        const providerEventId = `evt-ux-r3-automate-dup-claimed-${randomUUID().slice(0, 8)}`;
        const providerLegId = `leg-ux-r3-automate-dup-claimed-${randomUUID().slice(0, 8)}`;
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
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

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

        const firstDedupeKey = String(firstBody?.data?.replaySafe?.dedupeKey || '');
        expect(firstDedupeKey.length).toBeGreaterThan(0);
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: firstDedupeKey,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
        expect(duplicateBody.data).not.toHaveProperty('timeline');
        expect(duplicateBody.data).not.toHaveProperty('canonicalEvent');
        expect(duplicateBody.data).not.toHaveProperty('audit');
        expect(duplicateBody.data).not.toHaveProperty('outbox');
        expect(duplicateBody.data).not.toHaveProperty('voicemailArtifact');
        expect(duplicateBody.data).not.toHaveProperty('transcription');

        const mineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3MineQuery}`,
          headers: storyUxR3MemberHeaders,
        });
        expect(mineResponse.status()).toBe(200);
        const mineBody = await mineResponse.json();
        const mineThread = findThreadSummary(
          mineBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );
        expect(mineThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.claimedVoicemail,
          state: 'CLAIMED',
          bucket: 'mine',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.claimedVoicemail,
        });
      },
    );

    test(
      '[P1] closed-thread inbound voicemail remains fail-closed with intake fallback and no voicemail artifact/transcription side effects @P1',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3InboundClosedPayload,
      }) => {
        const payload = {
          ...storyUxR3InboundClosedPayload,
          providerEventId: `evt-ux-r3-automate-closed-voice-${randomUUID().slice(0, 8)}`,
          providerLegId: `leg-ux-r3-automate-closed-voice-${randomUUID().slice(0, 8)}`,
          eventType: storyUxR3Context.events.inboundVoicemail,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: payload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
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
        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');

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
      '[P1] claimed-thread voicemail ownership remains actor-scoped with Mine for owner and Inbox for non-owner members @P1',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3MemberHeaders,
        storyUxR3InboxQuery,
        storyUxR3MineQuery,
        storyUxR3InboundVoicemailPayload,
      }) => {
        const providerEventId = `evt-ux-r3-automate-actor-scope-${randomUUID().slice(0, 8)}`;
        const providerLegId = `leg-ux-r3-automate-actor-scope-${randomUUID().slice(0, 8)}`;
        const payload = {
          ...storyUxR3InboundVoicemailPayload,
          providerEventId,
          providerLegId,
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

        const ownerMineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3MineQuery}`,
          headers: storyUxR3MemberHeaders,
        });
        expect(ownerMineResponse.status()).toBe(200);
        const ownerMineBody = await ownerMineResponse.json();
        const ownerMineThread = findThreadSummary(
          ownerMineBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );
        expect(ownerMineThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.claimedVoicemail,
          bucket: 'mine',
          voicemailLabel: storyUxR3Context.expectedLabels.claimedVoicemail,
        });

        const peerHeaders = createStoryUxR3Headers(storyUxR3Context, {
          userId: `${storyUxR3Context.userId}-peer`,
          orgUnitMemberships: [storyUxR3Context.orgUnitId],
        });
        const peerInboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
          headers: peerHeaders,
        });
        const peerMineResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3MineQuery}`,
          headers: peerHeaders,
        });
        expect(peerInboxResponse.status()).toBe(200);
        expect(peerMineResponse.status()).toBe(200);

        const peerInboxBody = await peerInboxResponse.json();
        const peerMineBody = await peerMineResponse.json();
        const peerInboxThread = findThreadSummary(
          peerInboxBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );
        const peerMineThread = findThreadSummary(
          peerMineBody?.data?.items,
          storyUxR3Context.threadIds.claimedVoicemail,
        );

        expect(peerInboxThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.claimedVoicemail,
          state: 'CLAIMED',
          bucket: 'inbox',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.claimedVoicemail,
        });
        expect(peerMineThread).toBeUndefined();
      },
    );

    test(
      '[P2] unclaimed voicemail label contract stays consistent between inbox summaries and thread detail payloads after webhook ingestion @P2',
      async ({
        request,
        storyUxR3Context,
        storyUxR3AdminHeaders,
        storyUxR3MemberHeaders,
        storyUxR3InboxQuery,
        storyUxR3InboundVoicemailPayload,
      }) => {
        const payload = {
          ...storyUxR3InboundVoicemailPayload,
          providerEventId: `evt-ux-r3-automate-unclaimed-${randomUUID().slice(0, 8)}`,
          providerLegId: `leg-ux-r3-automate-unclaimed-${randomUUID().slice(0, 8)}`,
          threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
          neighborId: storyUxR3Context.neighborIds.unclaimed,
          eventType: storyUxR3Context.events.inboundVoicemail,
        };

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyUxR3Context.paths.inboundWebhook,
          headers: storyUxR3AdminHeaders,
          data: payload,
        });
        expect(webhookResponse.status()).toBe(200);

        const inboxResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.inbox}${storyUxR3InboxQuery}`,
          headers: storyUxR3MemberHeaders,
        });
        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyUxR3Context.paths.threadDetail}/${storyUxR3Context.threadIds.unclaimedVoicemail}`,
          headers: storyUxR3AdminHeaders,
        });

        expect(inboxResponse.status()).toBe(200);
        expect(detailResponse.status()).toBe(200);

        const inboxBody = await inboxResponse.json();
        const detailBody = await detailResponse.json();
        const inboxThread = findThreadSummary(
          inboxBody?.data?.items,
          storyUxR3Context.threadIds.unclaimedVoicemail,
        );

        expect(inboxThread).toMatchObject({
          threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
          state: 'UNCLAIMED',
          bucket: 'inbox',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.unclaimedVoicemail,
        });
        expect(detailBody?.data?.thread).toMatchObject({
          threadId: storyUxR3Context.threadIds.unclaimedVoicemail,
          state: 'UNCLAIMED',
          voicemailIndicator: true,
          voicemailLabel: storyUxR3Context.expectedLabels.unclaimedVoicemail,
          lifecycle: {
            reopenedByInbound: false,
          },
        });
      },
    );
  },
);
