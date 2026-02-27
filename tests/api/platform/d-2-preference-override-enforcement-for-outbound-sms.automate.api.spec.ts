import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

const D2_IMPLEMENTATION_GAP =
  'Story d.2 preference override enforcement is not fully implemented yet for prefers_texting=NO refusal/persistence behavior.';

test.describe(
  'Story d.2 preference override enforcement for outbound sms (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] outbound SMS is refused when prefers_texting is NO and no override reason is supplied @P0',
      async ({ request, storyDContext, storyDMemberHeaders, storyDOutboundMessagePayload }) => {
        expect(D2_IMPLEMENTATION_GAP).toContain('not fully implemented');

        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: {
            ...storyDMemberHeaders,
            'x-test-connectshyft-prefers-texting': 'NO',
          },
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideRequired,
          refusalType: 'business',
          data: {
            policy: {
              requiresOverrideReason: true,
              prefersTexting: 'NO',
            },
          },
        });
      },
    );

    test.fixme(
      '[P0] valid override reason allows outbound SMS and persists override/audit metadata on success @P0',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: {
            ...storyDMemberHeaders,
            'x-test-connectshyft-prefers-texting': 'NO',
          },
          data: storyDOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            policyOverride: {
              applied: true,
              reason: storyDOverrideMessagePayload.overrideReason,
            },
            audit: {
              metadata: expect.objectContaining({
                override_reason: storyDOverrideMessagePayload.overrideReason,
              }),
            },
          },
        });
      },
    );

    test.fixme(
      '[P1] invalid override reasons are deterministically refused with no message/audit/outbox partial writes @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDInvalidOverrideMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: {
            ...storyDMemberHeaders,
            'x-test-connectshyft-prefers-texting': 'NO',
          },
          data: storyDInvalidOverrideMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideInvalid,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.message');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test.fixme(
      '[P1] CLOSED outbound SMS reopens first, then enforces preference override gate before dispatch @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOutboundMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}/messages`,
          headers: {
            ...storyDMemberHeaders,
            'x-test-connectshyft-prefers-texting': 'NO',
          },
          data: storyDOutboundMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyDContext.refusalCodes.smsOverrideRequired,
          data: {
            thread: {
              threadId: storyDContext.threadIds.closed,
              state: 'UNCLAIMED',
            },
            lifecycleEvent: storyDContext.eventNames.reopenedByUser,
          },
        });
      },
    );
  },
);
