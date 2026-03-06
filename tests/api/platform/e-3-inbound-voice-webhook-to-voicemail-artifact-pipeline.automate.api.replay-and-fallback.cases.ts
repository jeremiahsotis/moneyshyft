import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE3.fixture';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (Automate API) - Replay and Fallback',
  () => {
    test.beforeEach(async ({
      request,
      storyE3Context,
      storyE3AdminHeaders,
      storyE3NumberMappingPayload,
    }) => {
      await mapInboundVoiceNumber({
        request,
        path: storyE3Context.paths.numbersCollection,
        headers: storyE3AdminHeaders,
        payload: storyE3NumberMappingPayload,
      });
    });

    test(
      '[E3-AUTOMATE-API-101][P0] duplicate inbound voice webhook is replay-safe and suppresses duplicate domain writes after the first accepted voicemail event @P0',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(testInfo, 'e3-automate-api-101-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-101',
          providerEventNamespace: 'provider-event-e3-automate-api',
          voicemailDurationSeconds: 52,
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-101-first'),
          },
          data: webhookPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-101-duplicate'),
          },
          data: webhookPayload,
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
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
            },
            transcription: {
              requestQueued: true,
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

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
          ? (detailBody.data.thread.timeline as Array<{ eventName: string }>)
          : [];
        const voicemailEvents = timeline.filter(
          (entry) => entry.eventName === storyE3Context.eventNames.inboundVoiceVoicemail,
        );
        expect(voicemailEvents.length).toBe(1);
      },
    );

    test(
      '[E3-AUTOMATE-API-102][P1] explicit voice fallback event on an active thread never creates voicemail artifacts or transcription side effects @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(testInfo, 'e3-automate-api-102-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-102',
          providerEventNamespace: 'provider-event-e3-automate-api',
          eventType: 'voice.fallback',
          voicemailDurationSeconds: 52,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-102'),
          },
          data: webhookPayload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            correlation: {
              threadId,
              neighborId,
            },
            threadState: 'UNCLAIMED',
            lifecycle: {
              ensuredActiveThread: true,
              reusedThreadId: threadId,
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });

        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');
        expect(webhookBody.data).not.toHaveProperty('transcriptionOutbox');
      },
    );
  },
);
