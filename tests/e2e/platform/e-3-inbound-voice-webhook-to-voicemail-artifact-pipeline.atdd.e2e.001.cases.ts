import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '@playwright/test';
import {
  createStoryE3Context,
  createStoryE3Headers,
} from '../../support/factories/connectShyftStoryE3Factory';
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
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD E2E) - Case 001',
  () => {
    test(
      '[E3-ATDD-E2E-001][P0] end-to-end inbound voice webhook journey creates voicemail artifact on active thread timeline with deterministic context linkage @P0',
      async ({ request }, testInfo) => {
        const context = createStoryE3Context();
        const operatorHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE3Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await mapInboundVoiceNumber({
          request,
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.3 inbound mapped voice number',
            isActive: true,
          },
        });

        const threadId = await ensureThread({
          request,
          path: context.paths.threads,
          headers: adminHeaders,
          payload: {
            orgUnitId: context.orgUnitId,
            neighborId: context.neighborIds.voicemailUnclaimed,
            source: 'VOICE',
            lastInboundCsNumberId: 'cs-inbound-e3-e2e-001',
            preferredOutboundCsNumberId: 'cs-outbound-e3-e2e-001',
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context,
          neighborId: context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-e2e-001',
          providerEventNamespace: 'provider-event-e3-atdd-e2e',
          voicemailDurationSeconds: 63,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-e2e-001'),
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
            correlation: {
              deterministic: true,
              tenantId: context.tenantId,
              orgUnitId: context.orgUnitId,
              neighborId: context.neighborIds.voicemailUnclaimed,
            },
            timeline: {
              eventName: context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
              channel: 'voice',
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${threadId}`,
          headers: operatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_DETAIL_LOADED',
          data: {
            thread: {
              threadId,
              timeline: expect.any(Array),
            },
          },
        });
      },
    );
  },
);
