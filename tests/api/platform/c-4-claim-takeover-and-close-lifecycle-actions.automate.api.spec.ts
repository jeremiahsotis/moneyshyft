import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC4.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story c.4 claim, takeover, and close lifecycle actions (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.skip(
      '[P0] claim action returns canonical envelope keys and orgUnit-scoped context for authorized members @P0',
      async ({ request, storyC4Context, storyC4MemberHeaders, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: storyC4MemberHeaders,
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLAIM_READY',
          data: {
            threadId: storyC4Context.threadIds.unclaimed,
            context: {
              tenantId: storyC4Context.tenantId,
              orgUnitId: storyC4Context.orgUnitId,
            },
          },
        });
      },
    );

    test.skip(
      '[P0] takeover action returns canonical envelope keys, explicit reason, and takeover-ready context @P0',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4TakeoverPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/takeover`,
          headers: storyC4AdminHeaders,
          data: storyC4TakeoverPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_TAKEOVER_READY',
          data: {
            threadId: storyC4Context.threadIds.claimed,
            reason: storyC4TakeoverPayload.reason,
            context: {
              tenantId: storyC4Context.tenantId,
              orgUnitId: storyC4Context.orgUnitId,
            },
          },
        });
      },
    );

    test.skip(
      '[P1] tenant-viewer claim attempts are refused with deterministic refusal envelope and no thread mutation payload @P1',
      async ({ request, storyC4Context, storyC4ViewerHeaders, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: storyC4ViewerHeaders,
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.thread');
      },
    );

    test.skip(
      '[P1] orgUnit admins without membership are refused lifecycle action execution unless tenant-privileged override applies @P1',
      async ({ request, storyC4Context, storyC4ClaimPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
          headers: {
            'x-test-connectshyft-role': 'ORGUNIT_ADMIN',
            'x-test-connectshyft-user-id': storyC4Context.adminUserId,
            'x-test-connectshyft-orgunit-memberships': JSON.stringify([]),
            'x-tenant-id': storyC4Context.tenantId,
            'x-org-unit-id': storyC4Context.orgUnitId,
            'x-correlation-id': storyC4Context.correlationId,
            'x-csrf-token': storyC4Context.csrfToken,
          },
          data: storyC4ClaimPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          refusalType: 'business',
          message: expect.any(String),
        });
      },
    );

    test.skip(
      '[P1] close action transitions CLAIMED to CLOSED with audit and outbox provenance metadata when close endpoint lands @P1',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4ClosePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/close`,
          headers: storyC4AdminHeaders,
          data: storyC4ClosePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLOSED',
          data: {
            thread: {
              threadId: storyC4Context.threadIds.claimed,
              state: 'CLOSED',
            },
            audit: {
              metadata: expect.objectContaining({
                actor_user_id: storyC4Context.adminUserId,
                org_unit_id: storyC4Context.orgUnitId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                actor_user_id: storyC4Context.adminUserId,
                org_unit_id: storyC4Context.orgUnitId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P1] outbound call and message actions from CLOSED thread reopen same thread to UNCLAIMED and emit thread_reopened_by_user @P1',
      async ({ request, storyC4Context, storyC4MemberHeaders, storyC4OutboundMessagePayload }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}/call`,
          headers: storyC4MemberHeaders,
          data: {
            orgUnitId: storyC4Context.orgUnitId,
          },
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}/messages`,
          headers: storyC4MemberHeaders,
          data: storyC4OutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();

        expect(callBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'UNCLAIMED',
        });
        expect(messageBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'UNCLAIMED',
        });
        expect(callBody.data.lifecycleEvent).toBe(storyC4Context.eventNames.reopenedByUser);
        expect(messageBody.data.lifecycleEvent).toBe(storyC4Context.eventNames.reopenedByUser);
      },
    );

    test.skip(
      '[P2] inbound voice and fallback intake events preserve CLOSED state and do not trigger auto-reopen side effects @P2',
      async ({ request, storyC4Context, storyC4AdminHeaders, storyC4InboundVoicePayload }) => {
        const voiceResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC4Context.paths.inboundWebhook,
          headers: storyC4AdminHeaders,
          data: storyC4InboundVoicePayload,
        });
        const fallbackResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC4Context.paths.inboundWebhook,
          headers: storyC4AdminHeaders,
          data: {
            ...storyC4InboundVoicePayload,
            eventType: 'voice.fallback',
          },
        });

        expect(voiceResponse.status()).toBe(200);
        expect(fallbackResponse.status()).toBe(200);

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.closed}`,
          headers: storyC4AdminHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody.data.thread).toMatchObject({
          threadId: storyC4Context.threadIds.closed,
          state: 'CLOSED',
        });
        expect(detailBody.data.thread.lifecycle).not.toMatchObject({
          reopenedByInbound: true,
        });
      },
    );
  },
);
