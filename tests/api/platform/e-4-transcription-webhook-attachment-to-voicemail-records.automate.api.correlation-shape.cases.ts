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
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (Automate API) - Correlation Shape and Scope',
  () => {
    test(
      '[E4-AUTOMATE-API-101][P0] snake_case callback correlation payload variants still attach transcription to the deterministic voicemail artifact @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'automate-api',
          scenarioId: '101',
        });

        const transcriptText =
          'Snake case correlation payload mapped transcript attachment.';
        const {
          response: callbackResponse,
          body: callbackBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-automate-api-101-callback',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
          mutatePayload: (callbackPayload) => {
            const snakeCaseCorrelation = {
              tenant_id: seeded.context.tenantId,
              org_unit_id: seeded.context.orgUnitId,
              thread_id: seeded.threadId,
              provider_event_id: seeded.callbackCorrelation.providerEventId,
              provider_leg_id: seeded.callbackCorrelation.providerLegId,
              voicemail_artifact_id: seeded.callbackCorrelation.voicemailArtifactId,
            };
            const snakeCasePayload = {
              ...callbackPayload,
              callback_correlation: snakeCaseCorrelation,
              providerPayload: {
                ...(callbackPayload.providerPayload as Record<string, unknown>),
                callback_correlation: snakeCaseCorrelation,
                transcription_text: transcriptText,
              },
            } as Record<string, unknown>;
            delete snakeCasePayload.callbackCorrelation;
            delete snakeCasePayload.transcript;
            return snakeCasePayload;
          },
        });

        expect(callbackResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
          data: {
            correlation: {
              deterministic: true,
              threadId: seeded.threadId,
              tenantId: seeded.context.tenantId,
              orgUnitId: seeded.context.orgUnitId,
            },
            transcriptionAttachment: {
              applied: true,
              transcriptText,
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
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            voicemailArtifacts: expect.arrayContaining([
              expect.objectContaining({
                artifactId: seeded.callbackCorrelation.voicemailArtifactId,
                transcription: expect.objectContaining({
                  available: true,
                  text: transcriptText,
                }),
              }),
            ]),
          },
        });
      },
    );

    test(
      '[E4-AUTOMATE-API-102][P1] callback correlation thread scope mismatches are refused deterministically with no transcription timeline mutation @P1',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'automate-api',
          scenarioId: '102',
        });

        const {
          response: callbackResponse,
          body: callbackBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText: 'Thread scope mismatch should refuse callback processing.',
          label: 'e4-automate-api-102-callback',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
          mutatePayload: (callbackPayload) => ({
            ...callbackPayload,
            callbackCorrelation: {
              ...callbackPayload.callbackCorrelation,
              threadId: `${seeded.threadId}-mismatch`,
            },
          }),
        });

        expect(callbackResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
          data: {
            sideEffects: {
              transcriptMutationApplied: false,
              orphanTranscriptPrevented: true,
            },
            audit: {
              metadata: {
                reason: 'callback_correlation_scope_invalid',
              },
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
