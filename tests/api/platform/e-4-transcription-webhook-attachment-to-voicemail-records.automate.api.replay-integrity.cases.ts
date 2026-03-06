import { test, expect } from '../../support/fixtures/connectShyftStoryE4.fixture';
import {
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  countStoryE4TimelineEvents,
  fetchStoryE4ThreadDetail,
  postStoryE4TranscriptionCallback,
  seedStoryE4VoicemailScenario,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (Automate API) - Replay Integrity',
  () => {
    test(
      '[E4-AUTOMATE-API-103][P0] duplicate callbacks with altered transcript payloads stay replay-safe and preserve the first attached transcript contract @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'automate-api',
          scenarioId: '103',
        });

        const initialTranscriptText =
          'Initial callback transcript should be retained after duplicate suppression.';
        const duplicateTranscriptText =
          'Duplicate callback tries to overwrite transcript but should be suppressed.';

        const {
          response: firstResponse,
          body: firstBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText: initialTranscriptText,
          label: 'e4-automate-api-103-callback',
          signatureLabel: 'e4-automate-api-103-callback-first',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
        });

        const {
          response: duplicateResponse,
          body: duplicateBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText: initialTranscriptText,
          label: 'e4-automate-api-103-callback',
          signatureLabel: 'e4-automate-api-103-callback-duplicate',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
          mutatePayload: (payload) => ({
            ...payload,
            transcript: {
              ...payload.transcript,
              text: duplicateTranscriptText,
            },
            providerPayload: {
              ...payload.providerPayload,
              transcription_text: duplicateTranscriptText,
            },
          }),
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);
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

        const {
          response: detailResponse,
          body: detailBody,
        } = await fetchStoryE4ThreadDetail({
          request,
          seeded,
        });
        expect(detailResponse.status()).toBe(200);
        expect(
          countStoryE4TimelineEvents(
            detailBody,
            seeded.context.eventNames.transcriptionAttached,
          ),
        ).toBe(1);

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
