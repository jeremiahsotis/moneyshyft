import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD2.fixture';

test.describe('Story d.2 Preference Override Enforcement for Outbound SMS (ATDD API RED)', () => {
  test.skip(
    '[P0] refuses outbound sms for prefers_texting NO threads when override reason is missing and persists no partial side effects @P0',
    async ({
      request,
      storyD2Context,
      storyD2OperatorHeaders,
      storyD2MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD2Context.paths.threads}/${storyD2Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyD2OperatorHeaders,
        data: storyD2MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: storyD2Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        message: expect.stringContaining('override reason'),
      });
      expect(body).not.toHaveProperty('data.dispatch');
      expect(body).not.toHaveProperty('data.audit');
      expect(body).not.toHaveProperty('data.outbox');
      expect(body).not.toHaveProperty('data.thread.stateTransition');
    },
  );

  test.skip(
    '[P0] allows outbound sms with valid override reason and persists override audit metadata on success @P0',
    async ({
      request,
      storyD2Context,
      storyD2OperatorHeaders,
      storyD2MessageWithValidOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD2Context.paths.threads}/${storyD2Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyD2OperatorHeaders,
        data: storyD2MessageWithValidOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
        data: {
          thread: {
            threadId: storyD2Context.threadIds.unclaimedPrefersNo,
            state: 'UNCLAIMED',
          },
          preferenceOverride: {
            required: true,
            applied: true,
            reasonCode: storyD2MessageWithValidOverridePayload.override.reasonCode,
            actorUserId: storyD2Context.userId,
          },
          audit: {
            eventName: 'connectshyft.thread.message_override_applied',
            metadata: expect.objectContaining({
              reason_code: storyD2MessageWithValidOverridePayload.override.reasonCode,
              thread_id: storyD2Context.threadIds.unclaimedPrefersNo,
            }),
          },
        },
      });
    },
  );

  test.skip(
    '[P0] invalid override reason returns deterministic refusal envelope and records no dispatch mutation @P0',
    async ({
      request,
      storyD2Context,
      storyD2OperatorHeaders,
      storyD2MessageWithInvalidOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD2Context.paths.threads}/${storyD2Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyD2OperatorHeaders,
        data: storyD2MessageWithInvalidOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: storyD2Context.refusalCodes.overrideInvalid,
        refusalType: 'business',
        message: expect.any(String),
      });
      expect(body).not.toHaveProperty('data.dispatch');
      expect(body).not.toHaveProperty('data.audit');
      expect(body).not.toHaveProperty('data.outbox');
    },
  );

  test.skip(
    '[P1] closed-thread outbound sms reopens same thread before preference override check and still refuses when override absent @P1',
    async ({
      request,
      storyD2Context,
      storyD2OperatorHeaders,
      storyD2MessageWithoutOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD2Context.paths.threads}/${storyD2Context.threadIds.closedPrefersNo}/messages`,
        headers: storyD2OperatorHeaders,
        data: storyD2MessageWithoutOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: storyD2Context.refusalCodes.overrideRequired,
        refusalType: 'business',
        data: {
          thread: {
            threadId: storyD2Context.threadIds.closedPrefersNo,
            priorState: 'CLOSED',
            state: 'UNCLAIMED',
          },
          lifecycleEvent: storyD2Context.eventNames.reopenedByUser,
        },
      });
      expect(body).not.toHaveProperty('data.dispatch');
    },
  );

  test.skip(
    '[P1] closed-thread outbound sms with valid override reopens and dispatches with linked reopen and override lineage @P1',
    async ({
      request,
      storyD2Context,
      storyD2OperatorHeaders,
      storyD2MessageWithValidOverridePayload,
    }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: `${storyD2Context.paths.threads}/${storyD2Context.threadIds.closedPrefersNo}/messages`,
        headers: storyD2OperatorHeaders,
        data: storyD2MessageWithValidOverridePayload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
        data: {
          thread: {
            threadId: storyD2Context.threadIds.closedPrefersNo,
            state: 'UNCLAIMED',
          },
          lifecycleEvent: storyD2Context.eventNames.reopenedByUser,
          preferenceOverride: {
            applied: true,
            reasonCode: storyD2MessageWithValidOverridePayload.override.reasonCode,
          },
          audit: {
            metadata: expect.objectContaining({
              prior_state: 'CLOSED',
              new_state: 'UNCLAIMED',
              reason_code: storyD2MessageWithValidOverridePayload.override.reasonCode,
            }),
          },
        },
      });
    },
  );
});
