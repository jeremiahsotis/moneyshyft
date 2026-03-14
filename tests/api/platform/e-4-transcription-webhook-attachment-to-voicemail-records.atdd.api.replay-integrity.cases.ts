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
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD API RED) - Replay Integrity',
  () => {
    test(
      '[E4-ATDD-API-004][P0] duplicate transcription callbacks for the same event identity are replay-safe and suppress duplicate timeline mutations @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '004',
        });

        const transcriptText =
          'Operator callback duplicate suppression validation transcript.';

        const {
          response: firstResponse,
          body: firstBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-004',
          signatureLabel: 'e4-atdd-api-004-first',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
        });
        const {
          response: duplicateResponse,
          body: duplicateBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-004',
          signatureLabel: 'e4-atdd-api-004-duplicate',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
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
          },
        });
        const dedupeKey = String(firstBody?.data?.replaySafe?.dedupeKey || '');
        expect(dedupeKey.length).toBeGreaterThan(0);
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_DUPLICATE_SUPPRESSED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey,
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
      },
    );

    test(
      '[E4-ATDD-API-006][P0] replay retries proceed after non-applied refusal and attach transcript when a corrected payload is replayed with the same provider event id @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '006',
        });

        const transcriptText =
          'Retry-safe callback replay should attach after correction.';

        const {
          response: firstAttemptResponse,
          body: firstAttemptBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-006',
          signatureLabel: 'e4-atdd-api-006-first',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
          mutatePayload: (payload) => ({
            ...payload,
            transcript: {
              ...payload.transcript,
              text: ' ',
            },
            providerPayload: {
              ...(payload.providerPayload as Record<string, unknown>),
              transcription_text: ' ',
            },
          }),
        });
        expect(firstAttemptResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(firstAttemptBody)).toBe(true);
        expect(firstAttemptBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
        });

        const {
          response: replayResponse,
          body: replayBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-006',
          signatureLabel: 'e4-atdd-api-006-replay',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
        });
        expect(replayResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(replayBody)).toBe(true);
        expect(replayBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
            transcriptionAttachment: {
              applied: true,
              voicemailArtifactId: seeded.callbackCorrelation.voicemailArtifactId,
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
      },
    );
  },
);
