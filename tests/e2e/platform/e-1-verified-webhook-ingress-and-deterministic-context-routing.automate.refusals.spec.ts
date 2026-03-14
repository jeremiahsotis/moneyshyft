import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE1Context,
  createStoryE1Headers,
} from '../../support/factories/connectShyftStoryE1Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignatureEnforcementHeaders,
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.1 Verified Webhook Ingress and Deterministic Context Routing (Automate E2E Expansion)',
  () => {
    test(
      '[E1-AUTOMATE-E2E-203][P1] spoofed ingress without signature is refused fail-closed and leaves existing thread lifecycle state unchanged @P1',
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

        const beforeDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}`,
          headers: operatorHeaders,
        });

        expect(beforeDetailResponse.status()).toBe(200);
        const beforeDetailBody = await beforeDetailResponse.json();
        const beforeState = beforeDetailBody?.data?.thread?.state;

        const payload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: context.numbers.mappedInbound,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e1-automate-unsigned-${deterministicToken(testInfo, 'unsigned-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate-e2e',
            testInfo,
            'unsigned-ingress',
          ),
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignatureEnforcementHeaders(),
          },
          data: payload,
        });

        expect(response.status()).toBe(401);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: context.refusalCodes.signatureMissing,
          refusalType: 'client',
          data: {
            signatureValidation: {
              deterministic: true,
              verified: false,
              provider: context.providers.enabledPrimary,
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });

        const afterDetailResponse = await apiRequest(request, {
          method: 'GET',
          path: `${context.paths.threads}/${context.threadIds.unclaimed}`,
          headers: operatorHeaders,
        });

        expect(afterDetailResponse.status()).toBe(200);
        const afterDetailBody = await afterDetailResponse.json();
        expect(afterDetailBody?.data?.thread?.state).toBe(beforeState);
      },
    );

    test(
      '[E1-AUTOMATE-E2E-204][P1] signed ingress without metadata and provider identifiers is refused deterministically with missing-identifiers diagnostics @P1',
      async ({ request }, testInfo) => {
        const context = createStoryE1Context();
        const adminHeaders = createStoryE1Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const payload = {
          eventType: 'voice.connected',
          providerKey: context.providers.enabledPrimary,
          providerEventId: deterministicProviderEventId(
            'provider-event-e1-automate-e2e',
            testInfo,
            'missing-identifiers',
          ),
        };

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.inboundWebhook,
          headers: {
            ...adminHeaders,
            ...buildSignedWebhookHeaders(payload, testInfo, 'automate-e2e-missing-identifiers'),
          },
          data: payload,
        });

        expect(response.status()).toBe(200);
        const body = (await response.json()) as Record<string, unknown>;
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_WEBHOOK_CORRELATION_IDENTIFIERS_REQUIRED',
          refusalType: 'business',
          data: {
            correlation: {
              deterministic: true,
              reason: 'missing-identifiers',
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
