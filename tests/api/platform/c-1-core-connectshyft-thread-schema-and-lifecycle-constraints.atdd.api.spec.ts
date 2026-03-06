import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC1.fixture';

test.describe(
  'Story c.1 Core ConnectShyft Thread Schema and Lifecycle Constraints (ATDD API RED)',
  () => {
    test.skip(
      '[P0] enforces canonical lifecycle states and required thread metadata on create and update contracts @P0',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const createResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1CreatePayload,
        });

        expect(createResponse.status()).toBe(201);
        const body = await createResponse.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_ENSURED',
          data: {
            thread: {
              tenantId: storyC1Context.tenantId,
              orgUnitId: storyC1Context.orgUnitId,
              neighborId: storyC1Context.neighborId,
              state: 'UNCLAIMED',
              lastInboundCsNumberId: storyC1Context.inboundCsNumberId,
              preferredOutboundCsNumberId: storyC1Context.preferredOutboundCsNumberId,
              escalation: {
                stage: 0,
                nextEvaluationAtUtc: expect.any(String),
              },
            },
          },
        });
        expect(storyC1Context.canonicalStates).toContain(body.data.thread.state);
      },
    );

    test.skip(
      '[P0] preserves one-active-thread identity under duplicate create attempts for same tenant orgUnit and neighbor tuple @P0',
      async ({
        request,
        storyC1Context,
        storyC1OperatorHeaders,
        storyC1CreatePayload,
        storyC1DuplicatePayload,
      }) => {
        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1CreatePayload,
        });
        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1DuplicatePayload,
        });

        expect(firstResponse.status()).toBe(201);
        expect(duplicateResponse.status()).toBe(201);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();

        expect(firstBody.data.thread.threadId).toBe(duplicateBody.data.thread.threadId);
        expect(duplicateBody.data.thread.state).toBe('UNCLAIMED');
      },
    );

    test.skip(
      '[P1] rejects non-canonical forced state values and returns deterministic refusal envelope without leaking persistence internals @P1',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1InvalidStatePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1InvalidStatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_STATE_INVALID',
          refusalType: 'business',
          message: expect.stringContaining('canonical lifecycle state'),
        });
        expect(body).not.toHaveProperty('data.sqlState');
      },
    );

    test.skip(
      '[P1] returns scheduler due-thread scans in deterministic order with next_evaluation_at_utc and thread_id tie-break sequencing @P1',
      async ({ request, storyC1Context, storyC1SchedulerHeaders, storyC1DueQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: `${storyC1Context.paths.dueThreads}${storyC1DueQuery}`,
          headers: storyC1SchedulerHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_DUE_THREADS_LISTED',
          data: {
            threads: expect.any(Array),
          },
        });

        const threads: Array<{ threadId: string; nextEvaluationAtUtc: string }> =
          body.data.threads;
        const sorted = [...threads].sort((a, b) => {
          const nextEval =
            new Date(a.nextEvaluationAtUtc).getTime() -
            new Date(b.nextEvaluationAtUtc).getTime();
          return nextEval !== 0 ? nextEval : a.threadId.localeCompare(b.threadId);
        });
        expect(threads).toEqual(sorted);
      },
    );
  },
);
