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
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD API RED) - Core',
  () => {
    test.skip(
      '[E4-ATDD-API-001][P0] valid transcription callback attaches transcript text to the correct voicemail artifact using deterministic callback correlation metadata @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-001)',
          neighborId: 'neighbor-connectshyft-e4-api-001',
          inboundNumberId: 'cs-inbound-e4-seed-api-001',
          outboundNumberId: 'cs-outbound-e4-seed-api-001',
          seedLabel: 'e4-seed-api-001',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-001',
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
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-atdd-api-001',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(callbackPayload, testInfo, 'e4-atdd-api-001'),
          },
          data: callbackPayload,
        });

        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
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

    test.skip(
      '[E4-ATDD-API-002][P1] successful transcript attachment is reflected in thread timeline and voicemail artifact transcript views when detail contracts are queried @P1',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-002)',
          neighborId: 'neighbor-connectshyft-e4-api-002',
          inboundNumberId: 'cs-inbound-e4-seed-api-002',
          outboundNumberId: 'cs-outbound-e4-seed-api-002',
          seedLabel: 'e4-seed-api-002',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-002',
        });
        const transcriptText =
          'Patient requested nurse follow-up regarding dosage adjustment.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-atdd-api-002',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(callbackPayload, testInfo, 'e4-atdd-api-002'),
          },
          data: callbackPayload,
        });
        expect(callbackResponse.status()).toBe(200);

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${seeded.context.paths.threads}/${seeded.threadId}`,
          headers: seeded.operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
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
