import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE1Context,
  createStoryE1Headers,
} from '../../support/factories/connectShyftStoryE1Factory';
import { deterministicProviderEventId } from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildVoiceWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate API Expansion)',
  () => {
    test(
      '[E1-AUTOMATE-API-105][P1] partial metadata mismatches against provider fallback identifiers are refused with deterministic conflict metadata @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const operatorHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const outboundResponse = await apiRequest(request, {
          method: 'POST',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}/call`,
          headers: operatorHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerKey: context.providers.enabledPrimary,
          },
        });

        expect(outboundResponse.status()).toBe(200);
        const outboundBody = await outboundResponse.json();
        const providerLegId = outboundBody?.data?.dispatch?.providerLegId as string;
        expect(typeof providerLegId).toBe('string');
        expect(providerLegId.length).toBeGreaterThan(0);

        const payload = buildVoiceWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          providerLegId,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate',
            testInfo,
            'partial-metadata-conflict',
          ),
          threadId: context.threadIds.closed,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-api-partial-metadata-conflict'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_CONFLICT',
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'conflict',
              providerLegId,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
            timelineOutcome: {
              eventName: null,
              routingDecision: 'refused',
            },
          },
        });
      },
    );
  },
);
