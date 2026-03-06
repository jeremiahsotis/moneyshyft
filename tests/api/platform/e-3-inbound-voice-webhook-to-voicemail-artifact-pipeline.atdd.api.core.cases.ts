import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE3.fixture';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
  resolvePersistedActorUserId,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD API) - Core Cases',
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
      '[E3-ATDD-API-001][P0] valid inbound voice webhook creates voicemail artifact linked to resolved active thread context @P0',
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
          label: 'e3-atdd-api-001',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-001'),
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
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
            },
            thread: {
              threadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
              state: 'UNCLAIMED',
            },
            lifecycle: {
              ensuredActiveThread: true,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
            voicemailArtifact: {
              artifactId: expect.any(String),
              channel: 'voice',
              direction: 'inbound',
              providerLegId: expect.any(String),
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-002][P0] no-active-thread voice inbound routes to intake fallback and does not pretend voicemail-only routing @P0',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
      }, testInfo) => {
        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.noActiveThread,
          testInfo,
          label: 'e3-atdd-api-002',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-002'),
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
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: storyE3Context.neighborIds.noActiveThread,
            },
            lifecycle: {
              ensuredActiveThread: false,
              reopenedByInbound: false,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-003][P1] claimed-thread inbound voice follows orgUnit-configured mode rather than forced voicemail-only defaults @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3OperatorHeaders,
        storyE3EnsurePayloadClaimed,
      }, testInfo) => {
        const claimedNeighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-003-neighbor',
        )}`;
        const claimedThreadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadClaimed,
            neighborId: claimedNeighborId,
          },
        });
        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const claimHeaders = {
          ...storyE3OperatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${claimedThreadId}/claim`,
          headers: claimHeaders,
        });
        expect(claimResponse.status()).toBe(200);

        const detailAfterClaimResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${claimedThreadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterClaimResponse.status()).toBe(200);
        const detailAfterClaimBody = await detailAfterClaimResponse.json();
        expect(String(detailAfterClaimBody?.data?.thread?.state || '')).toBe('CLAIMED');

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: claimedNeighborId,
          threadId: claimedThreadId,
          testInfo,
          label: 'e3-atdd-api-003',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-003'),
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
            threadState: 'CLAIMED',
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'accepted',
            },
            routingPolicy: {
              claimedMode: 'orgunit_configured_mode',
            },
            lifecycle: {
              reopenedByInbound: false,
            },
          },
        });
      },
    );
  },
);
