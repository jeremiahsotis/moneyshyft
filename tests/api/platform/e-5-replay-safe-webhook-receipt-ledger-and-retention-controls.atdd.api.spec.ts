import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
  hasRequiredEnvelopeKeys,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD API RED)',
  () => {
    test(
      '[E5-ATDD-API-001][P0] suppresses duplicate domain writes with unique (tenant, provider, sid, eventType) receipt identity @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.numbersCollection,
          headers: storyE5AdminHeaders,
          data: storyE5NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const providerEventId = deterministicProviderEventId(
          'provider-event-e5-atdd-api',
          testInfo,
          'duplicate-suppression',
        );
        const webhookPayload = buildSmsWebhookPayload({
          providerKey: storyE5Context.providers.enabledPrimary,
          to: storyE5Context.numbers.mappedInbound,
          from: storyE5Context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-atdd-${deterministicToken(testInfo, 'duplicate-suppression-message')}`,
          providerEventId,
        });
        const replayPayload = {
          ...webhookPayload,
          neighborId: 'neighbor-connectshyft-e5-duplicate-1001',
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(
              replayPayload,
              testInfo,
              'e5-atdd-api-001-first',
            ),
          },
          data: replayPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(
              replayPayload,
              testInfo,
              'e5-atdd-api-001-duplicate',
            ),
          },
          data: replayPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);

        expect(firstBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
          },
        });

        expect(duplicateBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: expect.any(String),
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });
      },
    );

    test(
      '[E5-ATDD-API-002][P0] first-seen receipt insertion allows downstream webhook processing and expected domain artifacts @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.numbersCollection,
          headers: storyE5AdminHeaders,
          data: storyE5NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const firstSeenPayload = buildSmsWebhookPayload({
          providerKey: storyE5Context.providers.enabledPrimary,
          to: storyE5Context.numbers.mappedInbound,
          from: storyE5Context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-first-seen-${deterministicToken(testInfo, 'first-seen-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e5-atdd-api',
            testInfo,
            'first-seen',
          ),
        });
        const acceptedPayload = {
          ...firstSeenPayload,
          neighborId: 'neighbor-connectshyft-e5-first-seen-1001',
        };

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(
              acceptedPayload,
              testInfo,
              'e5-atdd-api-002',
            ),
          },
          data: acceptedPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(hasRequiredEnvelopeKeys(body)).toBe(true);
        expect(body).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: false,
              suppressedDomainWrites: false,
              dedupeKey: expect.any(String),
            },
            sideEffects: {
              lifecycleMutationApplied: true,
              canonicalEventPersisted: true,
              outboxPersisted: false,
            },
            timelineOutcome: {
              routingDecision: 'accepted',
              eventName: expect.any(String),
            },
          },
        });
      },
    );

    test(
      '[E5-ATDD-API-003][P1] retention cleanup removes expired receipt rows while preserving active replay-safe window @P1',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5CleanupRequestPayload,
      }) => {
        const preCleanupMetrics = await apiRequest(request, {
          method: 'GET',
          path: storyE5Context.paths.receiptMetrics,
          headers: storyE5AdminHeaders,
        });

        const cleanupResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.receiptCleanup,
          headers: storyE5AdminHeaders,
          data: storyE5CleanupRequestPayload,
        });

        const postCleanupMetrics = await apiRequest(request, {
          method: 'GET',
          path: storyE5Context.paths.receiptMetrics,
          headers: storyE5AdminHeaders,
        });

        expect(preCleanupMetrics.status()).toBe(200);
        expect(cleanupResponse.status()).toBe(200);
        expect(postCleanupMetrics.status()).toBe(200);

        const cleanupBody = await cleanupResponse.json();
        const metricsBody = await postCleanupMetrics.json();
        expect(hasRequiredEnvelopeKeys(cleanupBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(metricsBody)).toBe(true);

        expect(cleanupBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.retentionApplied,
          data: {
            policyWindowDays: storyE5Context.receiptPolicyDays,
            expiredRowsRemoved: expect.any(Number),
            activeWindowProtected: true,
          },
        });
        expect(metricsBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.metricsLoaded,
          data: {
            retentionWindowDays: storyE5Context.receiptPolicyDays,
            totalRows: expect.any(Number),
            oldestRetainedAt: expect.any(String),
          },
        });
      },
    );

    test(
      '[E5-ATDD-API-004][P0] duplicate burst handling remains deterministic and within webhook latency budget @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.numbersCollection,
          headers: storyE5AdminHeaders,
          data: storyE5NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const burstPayload = buildSmsWebhookPayload({
          providerKey: storyE5Context.providers.enabledPrimary,
          to: storyE5Context.numbers.mappedInbound,
          from: storyE5Context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-burst-${deterministicToken(testInfo, 'burst-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e5-atdd-api',
            testInfo,
            'burst-duplicate',
          ),
        });
        const duplicateBurstPayload = {
          ...burstPayload,
          neighborId: 'neighbor-connectshyft-e5-burst-1001',
        };

        const start = Date.now();
        const burstResponses = await Promise.all(
          Array.from({ length: storyE5Context.duplicateBurstCount }).map((_, index) =>
            apiRequest(request, {
              method: 'POST',
              path: storyE5Context.paths.inboundWebhook,
              headers: {
                ...storyE5AdminHeaders,
                ...buildSignedWebhookHeaders(
                  duplicateBurstPayload,
                  testInfo,
                  `e5-atdd-api-004-${index}`,
                ),
              },
              data: duplicateBurstPayload,
            })),
        );
        const elapsedMs = Date.now() - start;

        const bodies = await Promise.all(
          burstResponses.map((response) => response.json()),
        );

        const firstSeenCount = bodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === false,
        ).length;
        const duplicateCount = bodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === true,
        ).length;

        expect(
          burstResponses.every((response) => response.status() === 200),
        ).toBe(true);
        expect(
          bodies.every((body) => hasRequiredEnvelopeKeys(body)),
        ).toBe(true);
        expect(firstSeenCount).toBe(1);
        expect(duplicateCount).toBe(storyE5Context.duplicateBurstCount - 1);
        expect(elapsedMs).toBeLessThanOrEqual(storyE5Context.latencyBudgetMs);
      },
    );
  },
);
