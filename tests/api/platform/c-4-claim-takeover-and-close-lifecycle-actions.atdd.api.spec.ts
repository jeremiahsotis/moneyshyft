import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC4.fixture';

test.describe('Story c.4 Claim Takeover and Close Lifecycle Actions (ATDD API RED)', () => {
  test(
    '[P0] allows only canonical claim takeover and close transitions with policy-enforced ownership checks @P0',
    async ({
      request,
      storyC4Context,
      storyC4MemberHeaders,
      storyC4AdminHeaders,
      storyC4ClaimPayload,
      storyC4TakeoverPayload,
      storyC4ClosePayload,
    }) => {
      const claimResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
        headers: storyC4MemberHeaders,
        data: storyC4ClaimPayload,
      });

      const takeoverResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/takeover`,
        headers: storyC4AdminHeaders,
        data: storyC4TakeoverPayload,
      });

      const closeResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.claimed}/close`,
        headers: storyC4AdminHeaders,
        data: storyC4ClosePayload,
      });

      expect(claimResponse.status()).toBe(200);
      expect(takeoverResponse.status()).toBe(200);
      expect(closeResponse.status()).toBe(200);

      const claimBody = await claimResponse.json();
      const takeoverBody = await takeoverResponse.json();
      const closeBody = await closeResponse.json();

      expect(claimBody.data.thread.state).toBe('CLAIMED');
      expect(takeoverBody.data.thread.state).toBe('CLAIMED');
      expect(closeBody.data.thread.state).toBe('CLOSED');
    },
  );

  test(
    '[P0] successful transitions emit audit and outbox records with actor orgUnit prior-state and new-state metadata @P0',
    async ({
      request,
      storyC4Context,
      storyC4AdminHeaders,
      storyC4ClosePayload,
    }) => {
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
            eventName: storyC4Context.eventNames.closed,
            metadata: expect.objectContaining({
              actor_user_id: storyC4Context.adminUserId,
              org_unit_id: storyC4Context.orgUnitId,
              prior_state: 'CLAIMED',
              new_state: 'CLOSED',
            }),
          },
          outbox: {
            eventName: storyC4Context.eventNames.closed,
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

  test(
    '[P0] outbound call or message from CLOSED reopens the same thread as UNCLAIMED and emits thread_reopened_by_user event @P0',
    async ({
      request,
      storyC4Context,
      storyC4MemberHeaders,
      storyC4OutboundMessagePayload,
    }) => {
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

  test(
    '[P1] inbound voice or fallback events on CLOSED threads do not auto-reopen and preserve terminal state guarantees @P1',
    async ({
      request,
      storyC4Context,
      storyC4AdminHeaders,
      storyC4InboundVoicePayload,
    }) => {
      const inboundResponse = await apiRequest(request, {
        method: 'POST',
        path: storyC4Context.paths.inboundWebhook,
        headers: storyC4AdminHeaders,
        data: storyC4InboundVoicePayload,
      });
      expect(inboundResponse.status()).toBe(200);

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

  test(
    '[P1] unauthorized lifecycle actions return deterministic refusal contracts with no state-mutation side effects @P1',
    async ({ request, storyC4Context, storyC4ViewerHeaders, storyC4ClaimPayload }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyC4Context.paths.threads}/${storyC4Context.threadIds.unclaimed}/claim`,
        headers: storyC4ViewerHeaders,
        data: storyC4ClaimPayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
        refusalType: 'business',
        message: expect.any(String),
      });
      expect(body).not.toHaveProperty('data.thread');
    },
  );
});
