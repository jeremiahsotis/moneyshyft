import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD.fixture';

const D3_IMPLEMENTATION_GAP =
  'Story d.3 traceability hardening is still pending for fully atomic audit/outbox persistence and refusal envelope parity across outbound/governance actions.';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

const hasRequiredEnvelopeKeys = (payload: Record<string, unknown>): boolean =>
  REQUIRED_ENVELOPE_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(payload, key),
  );

test.describe(
  'Story d.3 outbound audit, outbox, and refusal envelope integration (Automate API Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] successful outbound/governance actions persist domain + audit + outbox metadata atomically @P0',
      async ({
        request,
        storyDContext,
        storyDAdminHeaders,
        storyDClosePayload,
      }) => {
        expect(D3_IMPLEMENTATION_GAP).toContain('pending');

        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.claimed}/close`,
          headers: storyDAdminHeaders,
          data: storyDClosePayload,
        });

        expect(closeResponse.status()).toBe(200);
        const closeBody = await closeResponse.json();
        expect(hasRequiredEnvelopeKeys(closeBody)).toBe(true);
        expect(closeBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLOSED',
          data: {
            sideEffectsPersisted: true,
            audit: {
              metadata: expect.objectContaining({
                actor_user_id: storyDContext.adminUserId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                actor_user_id: storyDContext.adminUserId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
          },
        });
      },
    );

    test.fixme(
      '[P0] refused outbound/governance actions return shared business refusal envelope and write no partial side effects @P0',
      async ({
        request,
        storyDContext,
        storyDViewerHeaders,
        storyDClosePayload,
      }) => {
        const closeResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.claimed}/close`,
          headers: storyDViewerHeaders,
          data: storyDClosePayload,
        });

        expect(closeResponse.status()).toBe(200);
        const closeBody = await closeResponse.json();
        expect(hasRequiredEnvelopeKeys(closeBody)).toBe(true);
        expect(closeBody).toMatchObject({
          ok: false,
          refusalType: 'business',
          code: expect.any(String),
          message: expect.any(String),
        });
        expect(closeBody).not.toHaveProperty('data.audit');
        expect(closeBody).not.toHaveProperty('data.outbox');
        expect(closeBody).not.toHaveProperty('data.thread');
      },
    );

    test.fixme(
      '[P1] reopen-on-outbound lineage preserves prior/new state and thread_reopened_by_user metadata in audit/outbox @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDOutboundMessagePayload,
      }) => {
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.closed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(messageResponse.status()).toBe(200);
        const messageBody = await messageResponse.json();
        expect(messageBody).toMatchObject({
          ok: true,
          data: {
            lifecycleEvent: storyDContext.eventNames.reopenedByUser,
            audit: {
              eventName: storyDContext.eventNames.reopenedByUser,
              metadata: expect.objectContaining({
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
              }),
            },
            outbox: {
              eventName: storyDContext.eventNames.reopenedByUser,
              metadata: expect.objectContaining({
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
              }),
            },
          },
        });
      },
    );

    test.fixme(
      '[P1] envelope top-level contract remains deterministic across success and refusal paths for outbound safety actions @P1',
      async ({
        request,
        storyDContext,
        storyDMemberHeaders,
        storyDViewerHeaders,
        storyDOutboundMessagePayload,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: storyDMemberHeaders,
          data: storyDOutboundMessagePayload,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyDContext.paths.threads}/${storyDContext.threadIds.unclaimed}/messages`,
          headers: storyDViewerHeaders,
          data: storyDOutboundMessagePayload,
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        expect(hasRequiredEnvelopeKeys(successBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(refusalBody)).toBe(true);
        expect(successBody.ok).toBe(true);
        expect(refusalBody.ok).toBe(false);
      },
    );
  },
);
