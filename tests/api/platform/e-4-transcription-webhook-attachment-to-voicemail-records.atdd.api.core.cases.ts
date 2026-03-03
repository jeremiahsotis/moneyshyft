import { test, expect } from '../../support/fixtures/connectShyftStoryE4.fixture';
import {
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  fetchStoryE4ThreadDetail,
  postStoryE4TranscriptionCallback,
  seedStoryE4VoicemailScenario,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD API RED) - Core',
  () => {
    test(
      '[E4-ATDD-API-001][P0] valid transcription callback attaches transcript text to the correct voicemail artifact using deterministic callback correlation metadata @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '001',
        });
        expect(hasRequiredEnvelopeKeys(seeded.seedResponseBody)).toBe(true);
        expect(seeded.seedResponseBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            voicemailArtifact: {
              artifactId: expect.any(String),
            },
            transcription: {
              requestQueued: true,
              callbackCorrelation: {
                tenantId: seeded.context.tenantId,
                orgUnitId: seeded.context.orgUnitId,
                threadId: seeded.threadId,
                voicemailArtifactId: expect.any(String),
              },
            },
          },
        });

        const transcriptText =
          'Caller confirmed medication refill pickup after 3pm.';
        const {
          response: callbackResponse,
          body: callbackBody,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-001',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });
        expect(callbackResponse.status()).toBe(200);
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
          data: {
            correlation: {
              deterministic: true,
              tenantId: seeded.context.tenantId,
              orgUnitId: seeded.context.orgUnitId,
              threadId: seeded.threadId,
            },
            transcriptionAttachment: {
              applied: true,
              transcriptText,
              voicemailArtifactId: seeded.callbackCorrelation.voicemailArtifactId,
            },
            timeline: {
              eventName: seeded.context.eventNames.transcriptionAttached,
              routingDecision: 'accepted',
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
      },
    );

    test(
      '[E4-ATDD-API-002][P1] successful transcript attachment is reflected in thread timeline and voicemail artifact transcript views when detail contracts are queried @P1',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailScenario({
          request,
          testInfo,
          suite: 'atdd-api',
          scenarioId: '002',
        });
        const transcriptText =
          'Patient requested nurse follow-up regarding dosage adjustment.';
        const {
          response: callbackResponse,
        } = await postStoryE4TranscriptionCallback({
          request,
          seeded,
          testInfo,
          transcriptText,
          label: 'e4-atdd-api-002',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });
        expect(callbackResponse.status()).toBe(200);

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
            thread: {
              threadId: seeded.threadId,
              timeline: expect.arrayContaining([
                expect.objectContaining({
                  eventName: seeded.context.eventNames.transcriptionAttached,
                  metadata: expect.objectContaining({
                    voicemailArtifactId: seeded.callbackCorrelation.voicemailArtifactId,
                    transcriptAvailable: true,
                  }),
                }),
              ]),
            },
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
  },
);
