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
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (Automate API Expansion)',
  () => {
    test(
      '[E5-AUTOMATE-API-101][P0] same providerEventId across distinct sms event types processes once per eventType identity @P0',
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
          'provider-event-e5-automate-api',
          testInfo,
          'event-type-scope',
        );
        const basePayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-api-101-${deterministicToken(testInfo, 'event-type-scope-message')}`,
            providerEventId,
          }),
          neighborId: `neighbor-connectshyft-e5-automate-api-101-${deterministicToken(testInfo, 'event-type-scope-neighbor')}`,
        };

        const deliveredResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(basePayload, testInfo, 'e5-automate-api-101-delivered'),
          },
          data: basePayload,
        });

        const receivedPayload = {
          ...basePayload,
          eventType: 'sms.received',
        };
        const receivedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(receivedPayload, testInfo, 'e5-automate-api-101-received'),
          },
          data: receivedPayload,
        });

        expect(deliveredResponse.status()).toBe(200);
        expect(receivedResponse.status()).toBe(200);

        const deliveredBody = await deliveredResponse.json();
        const receivedBody = await receivedResponse.json();
        expect(hasRequiredEnvelopeKeys(deliveredBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(receivedBody)).toBe(true);

        expect(deliveredBody).toMatchObject({
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

        expect(receivedBody).toMatchObject({
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
            },
          },
        });

        expect(receivedBody?.data?.replaySafe?.dedupeKey).toBe(
          deliveredBody?.data?.replaySafe?.dedupeKey,
        );
      },
    );

    test(
      '[E5-AUTOMATE-API-102][P1] message id fallback dedupe suppresses same eventType duplicates but allows distinct eventType processing @P1',
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

        const providerMessageId = `MSG-E5-AUTOMATE-API-102-${deterministicToken(testInfo, 'message-fallback-id').toUpperCase()}`;
        const deliveredPayload = {
          eventType: 'sms.delivered',
          providerKey: storyE5Context.providers.enabledPrimary,
          providerPayload: {
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            message_uuid: providerMessageId,
          },
          neighborId: `neighbor-connectshyft-e5-automate-api-102-${deterministicToken(testInfo, 'message-fallback-neighbor')}`,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(deliveredPayload, testInfo, 'e5-automate-api-102-first'),
          },
          data: deliveredPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(deliveredPayload, testInfo, 'e5-automate-api-102-duplicate'),
          },
          data: deliveredPayload,
        });

        const receivedPayload = {
          ...deliveredPayload,
          eventType: 'sms.received',
        };

        const receivedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(receivedPayload, testInfo, 'e5-automate-api-102-received'),
          },
          data: receivedPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);
        expect(receivedResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        const receivedBody = await receivedResponse.json();

        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(receivedBody)).toBe(true);

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

        expect(receivedBody).toMatchObject({
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

        expect(duplicateBody?.data?.replaySafe?.dedupeKey).toBe(
          firstBody?.data?.replaySafe?.dedupeKey,
        );
        expect(receivedBody?.data?.replaySafe?.dedupeKey).not.toBe(
          duplicateBody?.data?.replaySafe?.dedupeKey,
        );
      },
    );

    test(
      '[E5-AUTOMATE-API-103][P1] cleanup dry-run preserves row totals while reporting active replay-safety protection @P1',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
        storyE5CleanupRequestPayload,
      }, testInfo) => {
        const mappingResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.numbersCollection,
          headers: storyE5AdminHeaders,
          data: storyE5NumberMappingPayload,
        });
        expect([200, 201]).toContain(mappingResponse.status());

        const seedPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-api-103-${deterministicToken(testInfo, 'cleanup-seed-message')}`,
            providerEventId: deterministicProviderEventId(
              'provider-event-e5-automate-api',
              testInfo,
              'cleanup-seed',
            ),
          }),
          neighborId: `neighbor-connectshyft-e5-automate-api-103-${deterministicToken(testInfo, 'cleanup-seed-neighbor')}`,
        };

        const seedResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(seedPayload, testInfo, 'e5-automate-api-103-seed'),
          },
          data: seedPayload,
        });
        expect(seedResponse.status()).toBe(200);

        const preMetrics = await apiRequest(request, {
          method: 'GET',
          path: storyE5Context.paths.receiptMetrics,
          headers: storyE5AdminHeaders,
        });

        const cleanupResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.receiptCleanup,
          headers: storyE5AdminHeaders,
          data: {
            ...storyE5CleanupRequestPayload,
            dryRun: true,
          },
        });

        const postMetrics = await apiRequest(request, {
          method: 'GET',
          path: storyE5Context.paths.receiptMetrics,
          headers: storyE5AdminHeaders,
        });

        expect(preMetrics.status()).toBe(200);
        expect(cleanupResponse.status()).toBe(200);
        expect(postMetrics.status()).toBe(200);

        const preMetricsBody = await preMetrics.json();
        const cleanupBody = await cleanupResponse.json();
        const postMetricsBody = await postMetrics.json();

        expect(hasRequiredEnvelopeKeys(preMetricsBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(cleanupBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(postMetricsBody)).toBe(true);

        expect(cleanupBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.retentionApplied,
          data: {
            policyWindowDays: storyE5Context.receiptPolicyDays,
            dryRun: true,
            activeWindowProtected: true,
            totalRowsBefore: expect.any(Number),
            totalRowsAfter: expect.any(Number),
          },
        });

        expect(cleanupBody?.data?.totalRowsAfter).toBe(cleanupBody?.data?.totalRowsBefore);
        expect(Number(postMetricsBody?.data?.totalRows)).toBeGreaterThanOrEqual(
          Number(preMetricsBody?.data?.totalRows),
        );
      },
    );
  },
);
