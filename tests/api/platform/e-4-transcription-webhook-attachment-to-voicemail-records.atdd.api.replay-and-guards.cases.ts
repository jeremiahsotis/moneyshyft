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
  'Story e.4 Transcription Webhook Attachment to Voicemail Records (ATDD API RED) - Guards and Replay',
  () => {
    test(
      '[E4-ATDD-API-003][P0] missing or invalid voicemail callback correlation identifiers are deterministically refused with no orphan transcript updates @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-003)',
          neighborId: 'neighbor-connectshyft-e4-api-003',
          inboundNumberId: 'cs-inbound-e4-seed-api-003',
          outboundNumberId: 'cs-outbound-e4-seed-api-003',
          seedLabel: 'e4-seed-api-003',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-003',
        });
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.missingCorrelationProbe,
          threadId: seeded.threadId,
          callbackCorrelation: {
            ...seeded.callbackCorrelation,
            voicemailArtifactId: 'vm-missing-e4-correlation',
          },
          transcriptText: 'This callback should be refused due to invalid mapping.',
          testInfo,
          label: 'e4-atdd-api-003',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(callbackPayload, testInfo, 'e4-atdd-api-003'),
          },
          data: callbackPayload,
        });

        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
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

    test(
      '[E4-ATDD-API-004][P0] duplicate transcription callbacks for the same event identity are replay-safe and suppress duplicate timeline mutations @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-004)',
          neighborId: 'neighbor-connectshyft-e4-api-004',
          inboundNumberId: 'cs-inbound-e4-seed-api-004',
          outboundNumberId: 'cs-outbound-e4-seed-api-004',
          seedLabel: 'e4-seed-api-004',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-004',
        });
        const transcriptText =
          'Operator callback duplicate suppression validation transcript.';
        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText,
          testInfo,
          label: 'e4-atdd-api-004',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(callbackPayload, testInfo, 'e4-atdd-api-004-first'),
          },
          data: callbackPayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(
              callbackPayload,
              testInfo,
              'e4-atdd-api-004-duplicate',
            ),
          },
          data: callbackPayload,
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
      },
    );

    test(
      '[E4-ATDD-API-005][P0] transcription callbacks without providerEventId are refused before side effects for deterministic idempotency keys @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-005)',
          neighborId: 'neighbor-connectshyft-e4-api-005',
          inboundNumberId: 'cs-inbound-e4-seed-api-005',
          outboundNumberId: 'cs-outbound-e4-seed-api-005',
          seedLabel: 'e4-seed-api-005',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-005',
        });

        const callbackPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.transcriptionTarget,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: 'Provider event id required refusal coverage.',
          testInfo,
          label: 'e4-atdd-api-005',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        }) as Record<string, unknown>;
        delete callbackPayload.providerEventId;

        const callbackResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(callbackPayload, testInfo, 'e4-atdd-api-005'),
          },
          data: callbackPayload,
        });

        expect(callbackResponse.status()).toBe(200);
        const callbackBody = await callbackResponse.json();
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

    test(
      '[E4-ATDD-API-006][P0] replay retries proceed after non-applied refusal and attach transcript when a corrected payload is replayed with the same provider event id @P0',
      async ({ request }, testInfo) => {
        const seeded = await seedStoryE4VoicemailWithCallbackCorrelation({
          request,
          testInfo,
          numberMappingLabel: 'Story e.4 mapped number (api-006)',
          neighborId: 'neighbor-connectshyft-e4-api-006',
          inboundNumberId: 'cs-inbound-e4-seed-api-006',
          outboundNumberId: 'cs-outbound-e4-seed-api-006',
          seedLabel: 'e4-seed-api-006',
          providerEventNamespace: 'provider-event-e4-atdd-api-seed',
          webhookHeaderLabel: 'e4-seed-api-006',
        });

        const replayPayload = buildStoryE4TranscriptionCallbackPayload({
          context: seeded.context,
          neighborId: seeded.context.neighborIds.duplicateReplayProbe,
          threadId: seeded.threadId,
          callbackCorrelation: seeded.callbackCorrelation,
          transcriptText: 'Retry-safe callback replay should attach after correction.',
          testInfo,
          label: 'e4-atdd-api-006',
          callbackEventNamespace: 'provider-event-e4-atdd-api-callback',
        });

        const firstAttemptPayload = {
          ...replayPayload,
          transcript: {
            ...replayPayload.transcript,
            text: ' ',
          },
          providerPayload: {
            ...(replayPayload.providerPayload || {}),
            transcription_text: ' ',
          },
        };

        const firstAttemptResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(firstAttemptPayload, testInfo, 'e4-atdd-api-006-first'),
          },
          data: firstAttemptPayload,
        });
        expect(firstAttemptResponse.status()).toBe(200);
        const firstAttemptBody = await firstAttemptResponse.json();
        expect(hasRequiredEnvelopeKeys(firstAttemptBody)).toBe(true);
        expect(firstAttemptBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_TRANSCRIPTION_CORRELATION_INVALID',
        });

        const replayResponse = await apiRequest(request, {
          method: 'POST',
          path: seeded.context.paths.inboundWebhook,
          headers: {
            ...seeded.adminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e4-atdd-api-006-replay'),
          },
          data: replayPayload,
        });
        expect(replayResponse.status()).toBe(200);
        const replayBody = await replayResponse.json();
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
      },
    );
  },
);
