import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  bootstrapStoryE3E2E,
  buildStoryE3VoicemailPayload,
  ensureThread,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD E2E) - Case 003',
  () => {
    test(
      '[E3-ATDD-E2E-003][P1] voicemail artifact pipeline emits transcription enqueue metadata and preserves lifecycle reset guards @P1',
      async ({ request }, testInfo) => {
        const { context, adminHeaders } = await bootstrapStoryE3E2E({
          request,
          numberMappingLabel: 'Story e.3 transcription queue number',
        });

        const threadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-003',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-003',
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-e2e-003',
          providerEventNamespace: 'provider-event-e3-atdd-e2e',
          voicemailDurationSeconds: 63,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-e2e-003'),
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
            lifecycle: {
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            transcription: {
              requestQueued: true,
              callbackCorrelation: {
                tenantId: context.tenantId,
                orgUnitId: context.orgUnitId,
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
