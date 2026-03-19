import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import {
  type InboundWebhookEnvelope,
  resolveFeedbackTaxonomy,
  type ThreadDetailEnvelope,
} from './g-6-volunteer-contract-boundary-and-regression-hardening.shared';

test.describe('Story g.6 Volunteer Contract Boundary and Regression Hardening (ATDD API RED)', () => {
  test(
    '[G6-ATDD-API-004][P0] inbound webhook activity on CLOSED threads keeps state locked and routes fallback without auto-reopen @P0',
    async ({
      request,
      storyG6Context,
      storyG6AdminHeaders,
      storyG6InboundClosedPayload,
    }) => {
      const webhookResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG6Context.paths.inboundWebhook,
        headers: storyG6AdminHeaders,
        data: storyG6InboundClosedPayload,
      });

      expect(webhookResponse.status()).toBe(200);
      const webhookBody = (await webhookResponse.json()) as InboundWebhookEnvelope;
      expect(webhookBody).toMatchObject({
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
          timeline: {
            routingDecision: 'intake_fallback',
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

  test(
    '[G6-ATDD-API-005][P1] volunteer action feedback contracts publish explicit success/refusal/error taxonomy without contradictory messaging @P1',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6OutboundCallPayload,
    }) => {
      const successResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}/call`,
        headers: storyG6VolunteerHeaders,
        data: storyG6OutboundCallPayload,
      });
      const refusalResponse = await apiRequest(request, {
        method: 'POST',
        path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.unclaimedPrefersNo}/messages`,
        headers: storyG6VolunteerHeaders,
        data: {
          orgUnitId: storyG6Context.orgUnitId,
          channel: 'sms',
          body: 'Outbound attempt without override metadata',
        },
      });
      const errorResponse = await apiRequest(request, {
        method: 'POST',
        path: storyG6Context.paths.threads,
        headers: storyG6VolunteerHeaders,
        data: {
          orgUnitId: storyG6Context.orgUnitId,
          neighborId: storyG6Context.neighborIds.closedInbound,
          source: 'VOICE',
          threadId: '2ddca35b-9ca0-4f2a-8827-31f5f4f83699',
          lastInboundCsNumberId: '+12605550196',
          preferredOutboundCsNumberId: '+12605550196',
        },
      });

      expect(successResponse.status()).toBe(200);
      expect(refusalResponse.status()).toBe(200);
      expect(errorResponse.status()).toBe(400);

      const successBody = (await successResponse.json()) as ThreadDetailEnvelope;
      const refusalBody = (await refusalResponse.json()) as ThreadDetailEnvelope;
      const errorBody = (await errorResponse.json()) as ThreadDetailEnvelope;

      expect(resolveFeedbackTaxonomy(successBody)).toBe('success');
      expect(refusalBody.refusalType).toBe('business');
      expect(resolveFeedbackTaxonomy(refusalBody)).toBe('refusal');
      expect(errorBody.refusalType).toBe('client');
      expect(resolveFeedbackTaxonomy(errorBody)).toBe('error');
      expect(String(refusalBody.data?.uiFeedback?.message ?? '')).not.toMatch(/reopened|auto-reopen/i);
      expect(String(errorBody.data?.uiFeedback?.message ?? '')).not.toMatch(/reopened|auto-reopen/i);
    },
  );
});
