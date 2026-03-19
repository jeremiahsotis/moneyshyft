import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryG6.fixture';
import {
  collectPrimaryCopy,
  type InboundWebhookEnvelope,
  type QueueEnvelope,
  readItems,
  resolveFeedbackTaxonomy,
  type ThreadDetailEnvelope,
  UUID_PATTERN,
} from './g-6-volunteer-contract-boundary-and-regression-hardening.shared';

test.describe('Epic G Volunteer UX Regression (Automate API Expansion)', () => {
  test(
    '[GEPIC-AUTO-API-301][P0] volunteer inbox and mine plus thread detail contracts stay display-safe and suppress internal metadata leakage @P0',
    async ({
      request,
      storyG6Context,
      storyG6VolunteerHeaders,
      storyG6InboxQuery,
      storyG6MineQuery,
    }) => {
      const [inboxResponse, mineResponse, detailResponse] = await Promise.all([
        apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.inbox}${storyG6InboxQuery}`,
          headers: storyG6VolunteerHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.inbox}${storyG6MineQuery}`,
          headers: storyG6VolunteerHeaders,
        }),
        apiRequest(request, {
          method: 'GET',
          path: `${storyG6Context.paths.threads}/${storyG6Context.threadIds.closedOutbound}`,
          headers: storyG6VolunteerHeaders,
        }),
      ]);

      expect(inboxResponse.status()).toBe(200);
      expect(mineResponse.status()).toBe(200);
      expect(detailResponse.status()).toBe(200);

      const inboxBody = (await inboxResponse.json()) as QueueEnvelope;
      const mineBody = (await mineResponse.json()) as QueueEnvelope;
      const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;

      expect(inboxBody.ok).toBe(true);
      expect(mineBody.ok).toBe(true);
      expect(detailBody.ok).toBe(true);

      const queueItems = [...readItems(inboxBody), ...readItems(mineBody)];
      expect(queueItems.length).toBeGreaterThan(0);

      for (const item of queueItems) {
        expect(item.display).toBeDefined();
        for (const forbiddenField of storyG6Context.forbiddenDisplayFields) {
          expect(item.display).not.toHaveProperty(forbiddenField);
        }

        const loweredCopy = collectPrimaryCopy(item).join(' ').toLowerCase();
        expect(loweredCopy.length).toBeGreaterThan(0);

        for (const token of storyG6Context.forbiddenPrimaryCopyTokens) {
          expect(loweredCopy).not.toContain(token);
        }
        expect(loweredCopy).not.toMatch(UUID_PATTERN);
      }

      expect(['UNCLAIMED', 'CLAIMED', 'CLOSED']).toContain(String(detailBody.data?.thread?.state));
    },
  );

  test(
    '[GEPIC-AUTO-API-302][P1] cross-action feedback taxonomy remains deterministic for success refusal and client-error paths @P1',
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
          body: 'Epic G regression check without override metadata.',
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
          threadId: 'd3edfbca-d2bc-4f28-8a6f-b9e08578b93f',
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
      expect(resolveFeedbackTaxonomy(refusalBody)).toBe('refusal');
      expect(resolveFeedbackTaxonomy(errorBody)).toBe('error');

      expect(successBody.data?.lifecycle).toMatchObject({
        priorState: 'CLOSED',
        nextState: 'UNCLAIMED',
        reopenedFromClosed: true,
        reopenedByInbound: false,
        sameThreadId: true,
      });

      expect(String(refusalBody.data?.uiFeedback?.message ?? '')).not.toMatch(/auto-reopen/i);
      expect(String(errorBody.data?.uiFeedback?.message ?? '')).not.toMatch(/auto-reopen/i);
    },
  );

  test(
    '[GEPIC-AUTO-API-303][P0] inbound webhook activity on CLOSED threads remains replay-safe and never auto-reopens volunteer thread state @P0',
    async ({
      request,
      storyG6Context,
      storyG6AdminHeaders,
      storyG6VolunteerHeaders,
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
        headers: storyG6VolunteerHeaders,
      });

      expect(detailResponse.status()).toBe(200);
      const detailBody = (await detailResponse.json()) as ThreadDetailEnvelope;
      expect(detailBody.data?.thread).toMatchObject({
        threadId: storyG6Context.threadIds.closedInbound,
        state: 'CLOSED',
      });
      expect(detailBody.data?.lifecycle?.reopenedByInbound).not.toBe(true);
      expect(String(detailBody.data?.uiFeedback?.message ?? '')).not.toMatch(/reopened|auto-reopen/i);
    },
  );
});
