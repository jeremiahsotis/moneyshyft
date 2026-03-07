import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import {
  type InboundWebhookEnvelope,
  type ThreadDetailEnvelope,
} from './g-6-volunteer-contract-boundary-and-regression-hardening.shared';

test.describe(
  'Story g.6 Volunteer Contract Boundary and Regression Hardening (Automate API Expansion)',
  () => {
    test(
      '[G6-AUTO-API-303][P0] repeated CLOSED outbound call dispatches keep same-thread reopen lifecycle semantics deterministic across requests @P0',
      async ({
        request,
        storyG6Context,
        storyG6VolunteerHeaders,
        storyG6OutboundCallPayload,
      }) => {
        const firstDispatch = await apiRequest(request, {
          method: 'POST',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
          headers: storyG6VolunteerHeaders,
          data: storyG6OutboundCallPayload,
        });
        const secondDispatch = await apiRequest(request, {
          method: 'POST',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
          headers: storyG6VolunteerHeaders,
          data: storyG6OutboundCallPayload,
        });

        expect(firstDispatch.status()).toBe(200);
        expect(secondDispatch.status()).toBe(200);

        const firstBody = (await firstDispatch.json()) as ThreadDetailEnvelope;
        const secondBody = (await secondDispatch.json()) as ThreadDetailEnvelope;

        for (const body of [firstBody, secondBody]) {
          expect(body.ok).toBe(true);
          expect(body.data?.thread).toMatchObject({
            threadId: storyG6Context.threadIds.closedOutbound,
            state: 'UNCLAIMED',
          });
          expect(body.data?.lifecycle).toMatchObject({
            priorState: 'CLOSED',
            nextState: 'UNCLAIMED',
            reopenedFromClosed: true,
            reopenedByInbound: false,
            sameThreadId: true,
            noInboundAutoReopenSideEffects: true,
          });
          expect(body.data?.uiFeedback).toMatchObject({
            severity: 'success',
            ariaLive: 'polite',
            presentation: 'contextual-action-feedback',
          });
        }
      },
    );

    test(
      '[G6-AUTO-API-304][P1] duplicate inbound events on CLOSED thread are replay-safe and keep state locked with no auto-reopen side effects @P1',
      async ({
        request,
        storyG6Context,
        storyG6AdminHeaders,
        storyG6InboundClosedPayload,
      }) => {
        const duplicatePayload = {
          ...storyG6InboundClosedPayload,
        };

        const firstWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyG6Context.paths.inboundWebhook,
          headers: storyG6AdminHeaders,
          data: duplicatePayload,
        });
        const duplicateWebhookResponse = await apiRequest(request, {
          method: 'POST',
          path: storyG6Context.paths.inboundWebhook,
          headers: storyG6AdminHeaders,
          data: duplicatePayload,
        });

        expect(firstWebhookResponse.status()).toBe(200);
        expect(duplicateWebhookResponse.status()).toBe(200);

        const firstBody = (await firstWebhookResponse.json()) as InboundWebhookEnvelope;
        const duplicateBody = (await duplicateWebhookResponse.json()) as InboundWebhookEnvelope;

        expect(firstBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            thread: {
              threadId: storyG6Context.threadIds.closedInbound,
              state: 'CLOSED',
            },
            lifecycle: {
              reopenedByInbound: false,
            },
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
            },
          },
        });
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedInbound}`,
          headers: storyG6AdminHeaders,
        });
        expect(detailResponse.status()).toBe(200);

        const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;
        expect(detailBody.data?.thread?.state).toBe('CLOSED');
      },
    );
  },
);
