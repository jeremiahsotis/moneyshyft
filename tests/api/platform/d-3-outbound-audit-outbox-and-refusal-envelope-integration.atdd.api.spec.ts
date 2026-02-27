import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryD3.fixture';

test.describe(
  'Story d.3 Outbound Audit, Outbox, and Refusal Envelope Integration (ATDD API RED)',
  () => {
    test.skip(
      '[P0] successful outbound actions persist audit and outbox records atomically with actor scope action and lifecycle metadata @P0',
      async ({
        request,
        storyD3Context,
        storyD3OperatorHeaders,
        storyD3OutboundCallPayload,
        storyD3OutboundMessagePayload,
      }) => {
        const callResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.unclaimed}/call`,
          headers: storyD3OperatorHeaders,
          data: storyD3OutboundCallPayload,
        });
        const messageResponse = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.unclaimed}/messages`,
          headers: storyD3OperatorHeaders,
          data: storyD3OutboundMessagePayload,
        });

        expect(callResponse.status()).toBe(200);
        expect(messageResponse.status()).toBe(200);

        const callBody = await callResponse.json();
        const messageBody = await messageResponse.json();

        expect(callBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            audit: {
              eventName: expect.any(String),
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.userId,
                org_unit_id: storyD3Context.orgUnitId,
                action: 'call',
                lifecycle_state: 'UNCLAIMED',
              }),
            },
            outbox: {
              eventName: expect.any(String),
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.userId,
                org_unit_id: storyD3Context.orgUnitId,
                action: 'call',
                lifecycle_state: 'UNCLAIMED',
              }),
            },
          },
        });

        expect(messageBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_MESSAGE_DISPATCHED',
          data: {
            audit: {
              eventName: expect.any(String),
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.userId,
                org_unit_id: storyD3Context.orgUnitId,
                action: 'message',
                lifecycle_state: 'UNCLAIMED',
              }),
            },
            outbox: {
              eventName: expect.any(String),
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.userId,
                org_unit_id: storyD3Context.orgUnitId,
                action: 'message',
                lifecycle_state: 'UNCLAIMED',
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P0] refused outbound actions return shared refusal envelope with policy reason code and no partial writes @P0',
      async ({
        request,
        storyD3Context,
        storyD3OperatorHeaders,
        storyD3PolicyRefusalMessagePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.unclaimed}/messages`,
          headers: storyD3OperatorHeaders,
          data: storyD3PolicyRefusalMessagePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyD3Context.refusalCodes.policyRefusal,
          refusalType: 'business',
          message: expect.any(String),
          reasonCode: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.dispatch');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test.skip(
      '[P0] reopen-on-outbound success emits prior/new state lineage and thread_reopened_by_user metadata across audit and outbox @P0',
      async ({
        request,
        storyD3Context,
        storyD3OperatorHeaders,
        storyD3OutboundCallPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.closed}/call`,
          headers: storyD3OperatorHeaders,
          data: storyD3OutboundCallPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CALL_DISPATCHED',
          data: {
            thread: {
              threadId: storyD3Context.threadIds.closed,
              state: 'UNCLAIMED',
            },
            lifecycleEvent: storyD3Context.eventNames.reopenedByUser,
            audit: {
              eventName: storyD3Context.eventNames.reopenedByUser,
              metadata: expect.objectContaining({
                prior_state: 'CLOSED',
                new_state: 'UNCLAIMED',
              }),
            },
            outbox: {
              eventName: storyD3Context.eventNames.reopenedByUser,
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
      '[P1] governance actions use the same atomic audit/outbox persistence contract on successful close transitions @P1',
      async ({
        request,
        storyD3Context,
        storyD3AdminHeaders,
        storyD3ClosePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.claimed}/close`,
          headers: storyD3AdminHeaders,
          data: storyD3ClosePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_CLOSED',
          data: {
            thread: {
              threadId: storyD3Context.threadIds.claimed,
              state: 'CLOSED',
            },
            audit: {
              eventName: storyD3Context.eventNames.closed,
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.adminUserId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
            outbox: {
              eventName: storyD3Context.eventNames.closed,
              metadata: expect.objectContaining({
                actor_user_id: storyD3Context.adminUserId,
                prior_state: 'CLAIMED',
                new_state: 'CLOSED',
              }),
            },
          },
        });
      },
    );

    test.skip(
      '[P1] governance refusal paths stay deterministic with shared envelope semantics and zero persistence side effects @P1',
      async ({
        request,
        storyD3Context,
        storyD3ViewerHeaders,
        storyD3ClosePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: `${storyD3Context.paths.threads}/${storyD3Context.threadIds.claimed}/close`,
          headers: storyD3ViewerHeaders,
          data: storyD3ClosePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyD3Context.refusalCodes.closeForbidden,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );
  },
);
