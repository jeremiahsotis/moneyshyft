import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';
import { deterministicProviderEventId } from '../../support/utils/deterministicTestIds';

test.describe(
  'Story d.1 outbound sms/call actions that preserve escalation semantics (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] outbound call/message on UNCLAIMED preserves escalation stage and returns explicit claim-only reset guidance @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDCallPayload,
        storyDOutboundMessagePayload,
      }) => {
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

    test(
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

    test(
      '[P1] outbound call orchestration is bridge-only with no auto-redial, and CONNECTED transitions auto-claim only from allowed call path @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDAdminHeaders,
        storyDCallPayload,
      }, testInfo) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/call`,
          headers: storyDMemberHeaders,
          data: storyDCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        const providerLegId = body?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            call: {
              transport: 'bridge',
              autoRetry: false,
              redialPolicy: 'manual_only',
              phases: ['initiated', 'ringing', 'connected', 'completed'],
            },
            autoClaimPolicy: {
              trigger: 'CONNECTED',
              appliesToState: 'UNCLAIMED',
              nextState: 'CLAIMED',
            },
          },
        });

        const unsupportedTransportResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/call`,
          headers: storyDMemberHeaders,
          data: {
            ...storyDCallPayload,
            call: {
              transport: 'sip',
            },
          },
        });
        expect(unsupportedTransportResponse.status()).toBe(200);
        const unsupportedTransportBody = await unsupportedTransportResponse.json();
        expect(unsupportedTransportBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_OUTBOUND_CALL_TRANSPORT_UNSUPPORTED',
        });

        const retryForbiddenResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/call`,
          headers: storyDMemberHeaders,
          data: {
            ...storyDCallPayload,
            call: {
              autoRetry: true,
              retryCount: 2,
            },
          },
        });
        expect(retryForbiddenResponse.status()).toBe(200);
        const retryForbiddenBody = await retryForbiddenResponse.json();
        expect(retryForbiddenBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_OUTBOUND_CALL_RETRY_FORBIDDEN',
        });

        const connectedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: storyDContext.threadIds.unclaimed,
            orgUnitId: storyDContext.orgUnitId,
            tenantId: storyDContext.tenantId,
            actorUserId: '00000000-0000-4000-8000-000000000042',
            transport: 'bridge',
            providerLegId,
            providerEventId: deterministicProviderEventId(
              'provider-event-d1-automate',
              testInfo,
              'connected-allowed',
            ),
          },
        });
        expect(connectedResponse.status()).toBe(200);
        const connectedBody = await connectedResponse.json();
        expect(connectedBody).toMatchObject({
          ok: true,
          data: {
            thread: {
              threadId: storyDContext.threadIds.unclaimed,
              state: 'CLAIMED',
            },
            lifecycle: {
              autoClaimedByConnectedEvent: true,
            },
            autoClaim: {
              attempted: true,
              applied: true,
              lifecycleEvent: 'connectshyft.thread.claimed',
            },
          },
        });

        const disallowedConnectedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: storyDContext.threadIds.unclaimed,
            orgUnitId: storyDContext.orgUnitId,
            tenantId: storyDContext.tenantId,
            transport: 'sip',
            providerEventId: deterministicProviderEventId(
              'provider-event-d1-automate',
              testInfo,
              'connected-disallowed',
            ),
          },
        });
        expect(disallowedConnectedResponse.status()).toBe(200);
        const disallowedConnectedBody = await disallowedConnectedResponse.json();
        expect(disallowedConnectedBody).toMatchObject({
          ok: true,
          data: {
            lifecycle: {
              autoClaimedByConnectedEvent: false,
            },
            autoClaim: {
              attempted: true,
              applied: false,
              reason: 'unsupported_transport',
            },
          },
        });
      },
    );

    test(
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

    test(
      '[P1] CONNECTED webhook without explicit transport does not auto-claim even when provider leg mapping exists @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDAdminHeaders,
        storyDCallPayload,
      }, testInfo) => {
        const regressionThreadId = storyDContext.threadIds.prefersNoUnclaimed;
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${regressionThreadId}/call`,
          headers: storyDMemberHeaders,
          data: storyDCallPayload,
        });
        expect(callResponse.status()).toBe(200);
        const callBody = await callResponse.json();
        const providerLegId = callBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const connectedWithoutTransportResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: regressionThreadId,
            orgUnitId: storyDContext.orgUnitId,
            tenantId: storyDContext.tenantId,
            providerLegId,
            providerEventId: deterministicProviderEventId(
              'provider-event-d1-automate',
              testInfo,
              'connected-without-transport',
            ),
          },
        });
        expect(connectedWithoutTransportResponse.status()).toBe(200);
        const connectedWithoutTransportBody = await connectedWithoutTransportResponse.json();
        expect(connectedWithoutTransportBody).toMatchObject({
          ok: true,
          data: {
            lifecycle: {
              autoClaimedByConnectedEvent: false,
            },
            autoClaim: {
              attempted: true,
              applied: false,
              reason: 'transport_required',
            },
          },
        });
      },
    );

    test(
      '[P1] CONNECTED webhook with metadata-only bridge transport does not auto-claim without mapped outbound lineage @P1',
      async ({
        request,
        storyDContext,
        storyDAdminHeaders,
        storyDMemberHeaders,
      }, testInfo) => {
        const regressionThreadId = storyDContext.threadIds.prefersNoUnclaimed;
        const metadataOnlyConnectedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyDContext.paths.inboundWebhook,
          headers: storyDAdminHeaders,
          data: {
            eventType: 'voice.connected',
            threadId: regressionThreadId,
            orgUnitId: storyDContext.orgUnitId,
            tenantId: storyDContext.tenantId,
            transport: 'bridge',
            providerEventId: deterministicProviderEventId(
              'provider-event-d1-automate',
              testInfo,
              'connected-metadata-only',
            ),
          },
        });
        expect(metadataOnlyConnectedResponse.status()).toBe(200);
        const metadataOnlyConnectedBody = await metadataOnlyConnectedResponse.json();
        expect(metadataOnlyConnectedBody).toMatchObject({
          ok: true,
          data: {
            lifecycle: {
              autoClaimedByConnectedEvent: false,
            },
            autoClaim: {
              attempted: true,
              applied: false,
              reason: 'unverified_call_lineage',
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyDContext.paths.threads}/${regressionThreadId}`,
          headers: storyDMemberHeaders,
        });
        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody?.data?.thread?.state).toBe('UNCLAIMED');
      },
    );
  },
);
