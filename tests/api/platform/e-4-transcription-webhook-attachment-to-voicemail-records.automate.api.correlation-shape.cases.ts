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
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (Automate API) - Correlation Shape and Scope',
  () => {
    test(
      '[E4-AUTOMATE-API-101][P0] snake_case callback correlation payload variants still attach transcription to the deterministic voicemail artifact @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 automate api-101 mapped number',
          neighborId: 'neighbor-connectshyft-e4-automate-api-101',
          inboundNumberId: 'cs-inbound-e4-automate-api-101',
          outboundNumberId: 'cs-outbound-e4-automate-api-101',
          seedLabel: 'e4-automate-api-101-seed',
          providerEventNamespace: 'provider-event-e4-automate-api-seed',
          webhookHeaderLabel: 'e4-automate-api-101-seed',
        });

        const transcriptText =
          'Snake case correlation payload mapped transcript attachment.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-automate-api-101-callback',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
        });

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

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              snakeCasePayload,
              testInfo,
              'e4-automate-api-101-callback',
            ),
          },
          data: snakeCasePayload,
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
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 automate api-102 mapped number',
          neighborId: 'neighbor-connectshyft-e4-automate-api-102',
          inboundNumberId: 'cs-inbound-e4-automate-api-102',
          outboundNumberId: 'cs-outbound-e4-automate-api-102',
          seedLabel: 'e4-automate-api-102-seed',
          providerEventNamespace: 'provider-event-e4-automate-api-seed',
          webhookHeaderLabel: 'e4-automate-api-102-seed',
        });

        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: 'Thread scope mismatch should refuse callback processing.',
          testInfo,
          label: 'e4-automate-api-102-callback',
          callbackEventNamespace: 'provider-event-e4-automate-api-callback',
        });

        const mismatchedScopePayload = {
          ...callbackPayload,
          callbackCorrelation: {
            ...callbackPayload.callbackCorrelation,
            threadId: `${seeded.threadId}-mismatch`,
          },
        };

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              mismatchedScopePayload as Record<string, unknown>,
              testInfo,
              'e4-automate-api-102-callback',
            ),
          },
          data: mismatchedScopePayload,
        });

        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
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
        expect(transcriptionEvents.length).toBe(0);
      },
    );
  },
);
