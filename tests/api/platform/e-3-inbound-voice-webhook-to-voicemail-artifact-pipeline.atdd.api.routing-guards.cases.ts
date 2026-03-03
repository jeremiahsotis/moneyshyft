import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE3.fixture';
import { deterministicToken } from '../../support/utils/deterministicTestIds';
import {
  buildInvalidSignedWebhookHeaders,
  buildSignedWebhookHeaders,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE3VoicemailPayload,
  ensureThread,
  mapInboundVoiceNumber,
} from '../../support/helpers/connectShyftStoryE3TestHelpers';

test.describe(
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (ATDD API) - Routing Guards',
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
      '[E3-ATDD-API-005][P1] voicemail-only inbound processing keeps escalation and inactivity windows unchanged unless locked lifecycle rules require a change @P1',
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

        const detailBeforeResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailBeforeResponse.status()).toBe(200);
        const detailBeforeBody = await detailBeforeResponse.json();
        const beforeStage = Number(detailBeforeBody?.data?.thread?.escalation?.stage ?? 0);
        const beforeInactivity = String(detailBeforeBody?.data?.thread?.nextEvaluationAtUtc ?? '');

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.voicemailUnclaimed,
          threadId,
          testInfo,
          label: 'e3-atdd-api-005',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-005'),
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
          },
        });

        const detailAfterResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterResponse.status()).toBe(200);
        const detailAfterBody = await detailAfterResponse.json();
        expect(Number(detailAfterBody?.data?.thread?.escalation?.stage ?? 0)).toBe(beforeStage);
        expect(String(detailAfterBody?.data?.thread?.nextEvaluationAtUtc ?? '')).toBe(beforeInactivity);
      },
    );

    test(
      '[E3-ATDD-API-006][P1] number-mapping correlation reroutes voicemail inbound to existing active thread for the resolved neighbor context @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const rerouteNeighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-006-neighbor',
        )}`;
        const existingThreadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId: rerouteNeighborId,
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: rerouteNeighborId,
          testInfo,
          label: 'e3-atdd-api-006',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-006'),
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
              source: 'number_mapping',
              threadId: existingThreadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: rerouteNeighborId,
            },
            threadId: existingThreadId,
            thread: {
              threadId: existingThreadId,
              state: 'UNCLAIMED',
              neighborId: rerouteNeighborId,
            },
            lifecycle: {
              ensuredActiveThread: true,
              reusedThreadId: existingThreadId,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceVoicemail,
              routingDecision: 'voicemail_only',
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-007][P1] metadata-correlated thread context wins over conflicting payload neighbor id to prevent thread-neighbor desynchronization @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const canonicalNeighborId = `${storyE3Context.neighborIds.voicemailUnclaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-007-neighbor-canonical',
        )}`;
        const conflictingNeighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(
          testInfo,
          'e3-atdd-api-007-neighbor-conflict',
        )}`;
        expect(conflictingNeighborId).not.toBe(canonicalNeighborId);

        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId: canonicalNeighborId,
          },
        });

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: conflictingNeighborId,
          threadId,
          testInfo,
          label: 'e3-atdd-api-007',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-007'),
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
              source: 'metadata',
              threadId,
              tenantId: storyE3Context.tenantId,
              orgUnitId: storyE3Context.orgUnitId,
              neighborId: canonicalNeighborId,
            },
            threadId,
            thread: {
              threadId,
              neighborId: canonicalNeighborId,
            },
          },
        });
      },
    );

    test(
      '[E3-ATDD-API-008][P1] invalid webhook signatures are refused fail-closed with explicit verification metadata and zero domain side effects @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
      }, testInfo) => {
        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId: storyE3Context.neighborIds.noActiveThread,
          testInfo,
          label: 'e3-atdd-api-008-invalid-signature',
          providerEventNamespace: 'provider-event-e3-atdd-api',
          voicemailDurationSeconds: 47,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildInvalidSignedWebhookHeaders(webhookPayload, testInfo, 'e3-atdd-api-008'),
          },
          data: webhookPayload,
        });

        expect(webhookResponse.status()).toBe(401);
        const webhookBody = await webhookResponse.json();
        expect(hasRequiredEnvelopeKeys(webhookBody)).toBe(true);
        expect(webhookBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_SIGNATURE_INVALID',
          refusalType: 'client',
          data: {
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: storyE3Context.providers.enabledPrimary,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
            timelineOutcome: {
              eventName: null,
              routingDecision: 'refused',
            },
          },
        });
      },
    );
  },
);
