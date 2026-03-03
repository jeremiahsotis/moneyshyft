import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE4.fixture';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE4TranscriptionCallbackPayload,
  seedStoryE4VoicemailWithCallbackCorrelation,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (Automate API) - Replay Integrity',
  () => {
    test(
      '[E4-AUTOMATE-API-103][P0] duplicate callbacks with altered transcript payloads stay replay-safe and preserve the first attached transcript contract @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 automate api-103 mapped number',
          neighborId: 'neighbor-connectshyft-e4-automate-api-103',
          inboundNumberId: 'cs-inbound-e4-automate-api-103',
          outboundNumberId: 'cs-outbound-e4-automate-api-103',
          seedLabel: 'e4-automate-api-103-seed',
          providerEventNamespace: 'provider-event-e4-automate-api-seed',
          webhookHeaderLabel: 'e4-automate-api-103-seed',
        });

        const initialTranscriptText =
          'Initial callback transcript should be retained after duplicate suppression.';
        const duplicateTranscriptText =
          'Duplicate callback tries to overwrite transcript but should be suppressed.';

        const firstCallbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: initialTranscriptText,
          testInfo,
          label: 'e4-automate-api-103-callback',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
        });

        const duplicateCallbackPayload = {
          ...firstCallbackPayload,
          transcript: {
            ...firstCallbackPayload.transcript,
            text: duplicateTranscriptText,
          },
          providerPayload: {
            ...firstCallbackPayload.providerPayload,
            transcription_text: duplicateTranscriptText,
          },
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              firstCallbackPayload as Record<string, unknown>,
              testInfo,
              'e4-automate-api-103-callback-first',
            ),
          },
          data: firstCallbackPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              duplicateCallbackPayload as Record<string, unknown>,
              testInfo,
              'e4-automate-api-103-callback-duplicate',
            ),
          },
          data: duplicateCallbackPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
            transcriptionAttachment: {
              applied: true,
              transcriptText: initialTranscriptText,
              voicemailArtifactId: seeded.callbackCorrelation.voicemailArtifactId,
            },
          },
        });

        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_DUPLICATE_SUPPRESSED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: firstBody?.data?.replaySafe?.dedupeKey,
            },
            sideEffects: {
              transcriptMutationApplied: false,
              timelineMutationApplied: false,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${seeded.context.paths.threads}/${seeded.threadId}`,
          headers: seeded.operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
          ? (detailBody.data.thread.timeline as Array<{ eventName?: string }>)
          : [];
        const transcriptionEvents = timeline.filter(
          (entry) => entry.eventName === seeded.context.eventNames.transcriptionAttached,
        );
        expect(transcriptionEvents.length).toBe(1);

        const voicemailArtifacts = Array.isArray(detailBody?.data?.voicemailArtifacts)
          ? (detailBody.data.voicemailArtifacts as Array<{
            artifactId?: string;
            transcription?: {
              available?: boolean;
              text?: string | null;
            };
          }>)
          : [];
        const targetedArtifact = voicemailArtifacts.find(
          (entry) => entry.artifactId === seeded.callbackCorrelation.voicemailArtifactId,
        );

        expect(targetedArtifact?.transcription?.available).toBe(true);
        expect(targetedArtifact?.transcription?.text).toBe(initialTranscriptText);
      },
    );
  },
);
