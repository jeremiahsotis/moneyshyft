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
  'Story e.3 Inbound Voice Webhook to Voicemail Artifact Pipeline (Automate API) - Closed Thread',
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
      '[E3-AUTOMATE-API-103][P1] closed thread voicemail ingress remains closed and routes to intake fallback without lifecycle resets or voicemail artifact writes @P1',
      async ({
        request,
        storyE3Context,
        storyE3AdminHeaders,
        storyE3OperatorHeaders,
        storyE3EnsurePayloadUnclaimed,
      }, testInfo) => {
        const neighborId = `${storyE3Context.neighborIds.voicemailClaimed}-${deterministicToken(testInfo, 'e3-automate-api-103-neighbor')}`;
        const threadId = await ensureThread({
          request,
          path: storyE3Context.paths.threads,
          headers: storyE3AdminHeaders,
          payload: {
            ...storyE3EnsurePayloadUnclaimed,
            neighborId,
          },
        });

        const persistedActorUserId = await resolvePersistedActorUserId(request);
        const actorHeaders = {
          ...storyE3OperatorHeaders,
          'x-test-connectshyft-user-id': persistedActorUserId,
        };

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${threadId}/claim`,
          headers: actorHeaders,
        });
        expect(claimResponse.status()).toBe(200);

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyE3Context.paths.threads}/${threadId}/close`,
          headers: actorHeaders,
        });
        expect(closeResponse.status()).toBe(200);

        const detailBeforeResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailBeforeResponse.status()).toBe(200);
        const detailBeforeBody = await detailBeforeResponse.json();
        expect(String(detailBeforeBody?.data?.thread?.state || '')).toBe('CLOSED');
        const beforeStage = Number(detailBeforeBody?.data?.thread?.escalation?.stage ?? 0);
        const beforeInactivity = String(detailBeforeBody?.data?.thread?.nextEvaluationAtUtc ?? '');

        const webhookPayload = buildStoryE3VoicemailPayload({
          context: storyE3Context,
          neighborId,
          threadId,
          testInfo,
          label: 'e3-automate-api-103',
          providerEventNamespace: 'provider-event-e3-automate-api',
          eventType: 'voice.voicemail',
          voicemailDurationSeconds: 52,
        });

        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE3Context.paths.inboundWebhook,
          headers: {
            ...storyE3AdminHeaders,
            ...buildSignedWebhookHeaders(webhookPayload, testInfo, 'e3-automate-api-103'),
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
              threadId,
              neighborId,
            },
            threadState: 'CLOSED',
            lifecycle: {
              ensuredActiveThread: false,
              reopenedByInbound: false,
              escalationResetApplied: false,
              inactivityResetApplied: false,
            },
            timeline: {
              eventName: storyE3Context.eventNames.inboundVoiceFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });
        expect(webhookBody.data).not.toHaveProperty('voicemailArtifact');
        expect(webhookBody.data).not.toHaveProperty('transcription');

        const detailAfterResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyE3Context.paths.threads}/${threadId}`,
          headers: storyE3AdminHeaders,
        });
        expect(detailAfterResponse.status()).toBe(200);
        const detailAfterBody = await detailAfterResponse.json();
        expect(String(detailAfterBody?.data?.thread?.state || '')).toBe('CLOSED');
        expect(Number(detailAfterBody?.data?.thread?.escalation?.stage ?? 0)).toBe(beforeStage);
        expect(String(detailAfterBody?.data?.thread?.nextEvaluationAtUtc ?? '')).toBe(beforeInactivity);
      },
    );
  },
);
