import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE3.fixture';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD API) - Transcription',
  () => {
    test.beforeEach(async ({
      request,
      storyE3Context,
      storyE3AdminHeaders,
      storyE3NumberMappingPayload,
    }) => {
      await mapInboundVoiceNumber({
        request,
        path: storyE3Context.paths.numbersCollection,
        headers: storyE3AdminHeaders,
        payload: storyE3NumberMappingPayload,
      });
    });

    test(
      '[E3-ATDD-API-004][P1] successful voicemail artifact creation enqueues transcription with durable callback correlation metadata @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: storyE3EnsurePayloadUnclaimed,
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-api-004',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-004'),
          },
          data: webhookPayload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            voicemailArtifact: {
              artifactId: expect.any(String),
            },
            transcription: {
              requestQueued: true,
              queueName: 'connectshyft.voicemail.transcription',
              callbackCorrelation: {
                tenantId: storyE3Context.tenantId,
                orgUnitId: storyE3Context.orgUnitId,
                threadId,
                providerEventId: webhookPayload.providerEventId,
                providerLegId: webhookPayload.providerLegId,
                voicemailArtifactId: expect.any(String),
              },
            },
          },
        });
      },
    );
  },
);
