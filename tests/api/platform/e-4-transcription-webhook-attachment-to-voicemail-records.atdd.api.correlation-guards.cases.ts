import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE4.fixture';
import {
  buildInvalidSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE4TranscriptionCallbackPayload,
  countStoryE4TimelineEvents,
  fetchStoryE4ThreadDetail,
  postStoryE4TranscriptionCallback,
  seedStoryE4VoicemailScenario,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD API RED) - Correlation Guards',
  () => {
    test(
      '[E4-ATDD-API-003][P0] missing or invalid voicemail callback correlation identifiers are deterministically refused with no orphan transcript updates @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '003',
        });

        const {
          response: callbackResponse,
          body: callbackBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText: 'This callback should be refused due to invalid mapping.',
          label: 'e4-atdd-api-003',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          neighborId: seeded.context.neighborIds.missingCorrelationProbe,
          mutatePayload: (payload) => ({
            ...payload,
            callbackCorrelation: {
              ...payload.callbackCorrelation,
              voicemailArtifactId: 'vm-missing-e4-correlation',
            },
          }),
        });

        expect(callbackResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
          data: {
            correlation: {
              deterministic: true,
              threadId: seeded.threadId,
            },
            sideEffects: {
              transcriptMutationApplied: false,
              orphanTranscriptPrevented: true,
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
        ).toBe(0);
      },
    );

    test(
      '[E4-ATDD-API-005][P0] transcription callbacks without providerEventId are refused before side effects for deterministic idempotency keys @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '005',
        });

        const {
          response: callbackResponse,
          body: callbackBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText: 'Provider event id required refusal coverage.',
          label: 'e4-atdd-api-005',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
          mutatePayload: (payload) => {
            const nextPayload = {
              ...payload,
            } as Record<string, unknown>;
            delete nextPayload.providerEventId;
            return nextPayload;
          },
        });

        expect(callbackResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_TRANSCRIPTION_PROVIDER_EVENT_REQUIRED',
          data: {
            replaySafe: {
              duplicate: false,
              dedupeKey: null,
            },
            sideEffects: {
              transcriptMutationApplied: false,
              orphanTranscriptPrevented: true,
            },
          },
        });
      },
    );

    test(
      '[E4-ATDD-API-007][P1] invalid webhook signatures on transcription callbacks are refused fail-closed before any transcript side effects @P1',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '007',
        });

        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: 'Invalid signature callback should fail closed.',
          testInfo,
          label: 'e4-atdd-api-007',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildInvalidSignedWebhookHeaders(
              callbackPayload,
              testInfo,
              'e4-atdd-api-007-invalid-signature',
            ),
          },
          data: callbackPayload,
        });

        expect(callbackResponse.status()).toBe(401);
        const callbackBody = await callbackResponse.json();
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
          refusalType: 'client',
          data: {
            signatureValidation: {
              deterministic: true,
              verified: false,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
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
        ).toBe(0);
      },
    );
  },
);
