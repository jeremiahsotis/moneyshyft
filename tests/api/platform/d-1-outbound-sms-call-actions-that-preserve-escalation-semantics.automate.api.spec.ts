import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

const D1_IMPLEMENTATION_GAP =
  'Story d.1 remains ready-for-dev: escalation-preserving outbound semantics and bridge-call orchestration contracts are not fully implemented.';

test.describe(
  'Story d.1 outbound sms/call actions that preserve escalation semantics (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] outbound call/message on UNCLAIMED preserves escalation stage and returns explicit claim-only reset guidance @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDCallPayload,
        storyDOutboundMessagePayload,
      }) => {
        expect(D1_IMPLEMENTATION_GAP).toContain('ready-for-dev');

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}`,
          headers: storyDMemberHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        const baselineStage = Number(detailBody?.data?.thread?.escalationStage ?? 0);

        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/call`,
          headers: storyDMemberHeaders,
          data: storyDCallPayload,
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
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
              state: 'UNCLAIMED',
              escalation: {
                stage: baselineStage,
              },
            },
            operatorFeedback: expect.stringMatching(/escalation continues until claim/i),
          },
        });
        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            thread: {
              state: 'UNCLAIMED',
              escalation: {
                stage: baselineStage,
              },
            },
            operatorFeedback: expect.stringMatching(/escalation continues until claim/i),
          },
        });
      },
    );

    test.fixme(
      '[P0] outbound actions from CLOSED reopen same thread id, emit thread_reopened_by_user, and reset inactivity/escalation before dispatch @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDCallPayload,
        storyDOutboundMessagePayload,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}/call`,
          headers: storyDMemberHeaders,
          data: storyDCallPayload,
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();
        for (const payload of [callBody, messageBody]) {
          expect(payload).toMatchObject({
            ok: true,
            data: {
              thread: {
                threadId: storyDContext.threadIds.closed,
                state: 'UNCLAIMED',
                escalation: {
                  stage: 0,
                },
              },
              escalationReset: {
                stage: 0,
                inactivityWindow: 'reset',
              },
              lifecycleEvent: storyDContext.eventNames.reopenedByUser,
            },
          });
        }
      },
    );

    test.fixme(
      '[P1] outbound call orchestration is bridge-only with no auto-redial, and CONNECTED transitions auto-claim only from allowed call path @P1',
      async ({ request, storyDContext, storyDMemberHeaders, storyDCallPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/call`,
          headers: storyDMemberHeaders,
          data: storyDCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            call: {
              transport: 'bridge',
              autoRetry: false,
              redialPolicy: 'manual_only',
            },
            autoClaimPolicy: {
              trigger: 'CONNECTED',
              appliesToState: 'UNCLAIMED',
            },
          },
        });
      },
    );

    test.fixme(
      '[P1] inbound voice/fallback events on CLOSED preserve CLOSED lifecycle and do not auto-reopen @P1',
      async ({
        request,
        storyDContext,
        storyDAdminHeaders,
        storyDInboundVoicePayload,
      }) => {
        const voiceResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: storyDInboundVoicePayload,
        });
        const fallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: {
            ...storyDInboundVoicePayload,
            eventType: 'voice.fallback',
          },
        });
        expect(voiceResponse.status()).toBe(200);
        expect(fallbackResponse.status()).toBe(200);

        const voiceBody = await voiceResponse.json();
        const fallbackBody = await fallbackResponse.json();
        expect(voiceBody?.data?.lifecycle?.reopenedByInbound).toBe(false);
        expect(fallbackBody?.data?.lifecycle?.reopenedByInbound).toBe(false);
        expect(voiceBody?.data?.timeline?.eventName).toBe(storyDContext.eventNames.inboundVoiceFallback);
        expect(fallbackBody?.data?.timeline?.eventName).toBe(storyDContext.eventNames.inboundVoiceFallback);
      },
    );
  },
);
