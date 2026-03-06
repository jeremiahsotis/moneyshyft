import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD1.fixture';

test.describe(
  'Story d.1 Outbound SMS/Call Actions that Preserve Escalation Semantics (ATDD API RED)',
  () => {
    test.skip(
      '[P0] unclaimed outbound call and sms keep escalation stage unchanged and communicate claim-only reset guidance @P0',
      async ({
        request,
        storyD1Context,
        storyD1OperatorHeaders,
        storyD1OutboundCallPayload,
        storyD1OutboundMessagePayload,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.unclaimed}/call`,
          headers: storyD1OperatorHeaders,
          data: storyD1OutboundCallPayload,
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.unclaimed}/messages`,
          headers: storyD1OperatorHeaders,
          data: storyD1OutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();

        expect(callBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            thread: {
              threadId: storyD1Context.threadIds.unclaimed,
              state: 'UNCLAIMED',
              escalation: {
                stage: 0,
              },
            },
            lifecycleEvent: null,
            escalationReset: null,
          },
        });

        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            thread: {
              threadId: storyD1Context.threadIds.unclaimed,
              state: 'UNCLAIMED',
              escalation: {
                stage: 0,
              },
            },
            lifecycleEvent: null,
            escalationReset: null,
          },
        });

        expect(callBody.data.outboundPolicy).toMatchObject({
          escalationResetSemantics: 'claim-only',
          operatorFeedback: expect.stringContaining('until claim'),
        });
      },
    );

    test.skip(
      '[P0] outbound call from CLOSED reopens same thread id before dispatch and emits thread_reopened_by_user lineage @P0',
      async ({ request, storyD1Context, storyD1OperatorHeaders, storyD1OutboundCallPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.closed}/call`,
          headers: storyD1OperatorHeaders,
          data: storyD1OutboundCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            thread: {
              threadId: storyD1Context.threadIds.closed,
              state: 'UNCLAIMED',
            },
            lifecycleEvent: storyD1Context.eventNames.reopenedByUser,
            escalationReset: {
              stage: 0,
              inactivityWindow: 'reset',
            },
            audit: {
              eventName: storyD1Context.eventNames.reopenedByUser,
              metadata: expect.objectContaining({
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
              }),
            },
            outbox: {
              eventName: storyD1Context.eventNames.reopenedByUser,
              metadata: expect.objectContaining({
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P1] outbound sms from CLOSED reopens same thread and applies reset semantics prior to dispatch @P1',
      async ({ request, storyD1Context, storyD1OperatorHeaders, storyD1OutboundMessagePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.closed}/messages`,
          headers: storyD1OperatorHeaders,
          data: storyD1OutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            thread: {
              threadId: storyD1Context.threadIds.closed,
              state: 'UNCLAIMED',
            },
            lifecycleEvent: storyD1Context.eventNames.reopenedByUser,
            escalationReset: {
              stage: 0,
              inactivityWindow: 'reset',
            },
          },
        });
      },
    );

    test.skip(
      '[P1] outbound call dispatch advertises bridge-only orchestration and disables automatic redial loops @P1',
      async ({ request, storyD1Context, storyD1OperatorHeaders, storyD1OutboundCallPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.unclaimed}/call`,
          headers: storyD1OperatorHeaders,
          data: storyD1OutboundCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            callOrchestration: {
              transport: 'bridge',
              webrtcEnabled: false,
              sipEnabled: false,
              softphoneEnabled: false,
              retryPolicy: {
                mode: 'manual-only',
                autoRedial: false,
                maxAttempts: 1,
              },
            },
          },
        });
      },
    );

    test.skip(
      '[P1] connected voice event auto-claims unclaimed thread and returns deterministic call-to-claim evidence @P1',
      async ({
        request,
        storyD1Context,
        storyD1AdminHeaders,
        storyD1OperatorHeaders,
        storyD1VoiceConnectedPayload,
      }) => {
        const webhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyD1Context.paths.inboundWebhook,
          headers: storyD1AdminHeaders,
          data: storyD1VoiceConnectedPayload,
        });

        expect(webhookResponse.status()).toBe(200);
        const webhookBody = await webhookResponse.json();

        expect(webhookBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            eventType: 'voice.connected',
            lifecycle: {
              connectedAutoClaimed: true,
              autoClaimReason: 'outbound_connected',
            },
            timeline: {
              eventName: storyD1Context.eventNames.claimed,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.unclaimed}`,
          headers: storyD1OperatorHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyD1Context.threadIds.unclaimed,
              state: 'CLAIMED',
              claimedByUserId: expect.any(String),
            },
          },
        });
      },
    );

    test.skip(
      '[P1] inbound voice voicemail and fallback events on CLOSED thread remain non-reopening and auditable @P1',
      async ({
        request,
        storyD1Context,
        storyD1AdminHeaders,
        storyD1InboundVoiceVoicemailPayload,
        storyD1InboundVoiceFallbackPayload,
      }) => {
        const voicemailResponse = await apiRequest(request, {
          method: 'POST',
          path: storyD1Context.paths.inboundWebhook,
          headers: storyD1AdminHeaders,
          data: storyD1InboundVoiceVoicemailPayload,
        });
        const fallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: storyD1Context.paths.inboundWebhook,
          headers: storyD1AdminHeaders,
          data: storyD1InboundVoiceFallbackPayload,
        });

        expect(voicemailResponse.status()).toBe(200);
        expect(fallbackResponse.status()).toBe(200);

        const voicemailBody = await voicemailResponse.json();
        const fallbackBody = await fallbackResponse.json();

        expect(voicemailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            threadId: storyD1Context.threadIds.closed,
            threadState: 'CLOSED',
            lifecycle: {
              reopenedByInbound: false,
            },
            timeline: {
              eventName: storyD1Context.eventNames.inboundFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });

        expect(fallbackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            threadId: storyD1Context.threadIds.closed,
            threadState: 'CLOSED',
            lifecycle: {
              reopenedByInbound: false,
            },
            timeline: {
              eventName: storyD1Context.eventNames.inboundFallback,
              routingDecision: 'intake_fallback',
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyD1Context.paths.threads}/${storyD1Context.threadIds.closed}`,
          headers: storyD1AdminHeaders,
        });
        expect(detailResponse.status()).toBe(200);

        const detailBody = await detailResponse.json();
        expect(detailBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyD1Context.threadIds.closed,
              state: 'CLOSED',
            },
          },
        });
      },
    );
  },
);
