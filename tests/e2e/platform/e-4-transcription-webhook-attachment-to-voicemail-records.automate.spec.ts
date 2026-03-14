import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE4TranscriptionCallbackPayload,
  seedStoryE4VoicemailWithCallbackCorrelation,
} from '../../support/helpers/connectShyftStoryE4TestHelpers';

test.describe(
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (Automate E2E Expansion)',
  () => {
    test(
      '[E4-AUTOMATE-E2E-201][P0] nested callback-correlation payload variants still surface transcript availability in operator thread detail contracts @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 automate e2e-201 mapped number',
          neighborId: '1c0940ff-1feb-45a8-84e8-5a07265ce4a8',
          inboundNumberId: 'cs-inbound-e4-automate-e2e-201',
          outboundNumberId: 'cs-outbound-e4-automate-e2e-201',
          seedLabel: 'e4-automate-e2e-201-seed',
          providerEventNamespace: 'provider-event-e4-automate-e2e-seed',
          webhookHeaderLabel: 'e4-automate-e2e-201-seed',
        });

        const transcriptText =
          'Nested callback payload should still map to voicemail transcript contract.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-automate-e2e-201-callback',
          callbackEventNamespace: 'provider-event-e4-automate-e2e-callback',
        });

        const nestedCorrelation = {
          tenant_id: seeded.context.tenantId,
          org_unit_id: seeded.context.orgUnitId,
          thread_id: seeded.threadId,
          provider_event_id: seeded.callbackCorrelation.providerEventId,
          provider_leg_id: seeded.callbackCorrelation.providerLegId,
          voicemail_artifact_id: seeded.callbackCorrelation.voicemailArtifactId,
        };

        const nestedPayload = {
          ...callbackPayload,
          data: {
            payload: {
              callback_correlation: nestedCorrelation,
              transcription_text: transcriptText,
            },
          },
          providerPayload: {
            ...callbackPayload.providerPayload,
            transcription_text: transcriptText,
          },
        } as Record<string, unknown>;
        delete nestedPayload.callbackCorrelation;
        delete nestedPayload.transcript;

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              nestedPayload,
              testInfo,
              'e4-automate-e2e-201-callback',
            ),
          },
          data: nestedPayload,
        });

        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
        expect(hasRequiredEnvelopeKeys(callbackBody)).toBe(true);
        expect(callbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CALLBACK_ATTACHED',
          data: {
            transcriptionAttachment: {
              applied: true,
              transcriptText,
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
            thread: {
              threadId: seeded.threadId,
              timeline: expect.arrayContaining([
                expect.objectContaining({
                  eventName: seeded.context.eventNames.transcriptionAttached,
                  metadata: expect.objectContaining({
                    transcriptAvailable: true,
                    voicemailArtifactId: seeded.callbackCorrelation.voicemailArtifactId,
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

    test(
      '[E4-AUTOMATE-E2E-202][P1] callback correlation scope mismatches remain invisible to operators by refusing attachment and preserving timeline consistency @P1',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 automate e2e-202 mapped number',
          neighborId: 'c0ca8f96-870f-48de-89c8-ff9c8b5ca142',
          inboundNumberId: 'cs-inbound-e4-automate-e2e-202',
          outboundNumberId: 'cs-outbound-e4-automate-e2e-202',
          seedLabel: 'e4-automate-e2e-202-seed',
          providerEventNamespace: 'provider-event-e4-automate-e2e-seed',
          webhookHeaderLabel: 'e4-automate-e2e-202-seed',
        });

        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: 'Scope mismatch should not appear in operator timeline.',
          testInfo,
          label: 'e4-automate-e2e-202-callback',
          callbackEventNamespace: 'provider-event-e4-automate-e2e-callback',
        });

        const mismatchedPayload = {
          ...callbackPayload,
          callbackCorrelation: {
            ...callbackPayload.callbackCorrelation,
            threadId: `${seeded.threadId}-scope-mismatch`,
          },
        };

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              mismatchedPayload as Record<string, unknown>,
              testInfo,
              'e4-automate-e2e-202-callback',
            ),
          },
          data: mismatchedPayload,
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
