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
import { withStoryE5RunScope } from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (Automate E2E Expansion)',
  () => {
    test(
      '[E5-AUTOMATE-E2E-201][P0] duplicate webhook replay journey appends one inbound timeline event while suppressing duplicate side effects @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5OperatorHeaders,
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
          withStoryE5RunScope(storyE5Context, 'provider-event-e5-automate-e2e'),
          testInfo,
          'timeline-deduped',
        );
        const replayPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-e2e-201-${deterministicToken(testInfo, 'timeline-message')}`,
            providerEventId,
          }),
          neighborId: `neighbor-connectshyft-e5-automate-e2e-201-${deterministicToken(testInfo, 'timeline-neighbor')}`,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e5-automate-e2e-201-first'),
          },
          data: replayPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e5-automate-e2e-201-duplicate'),
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
            },
            sideEffects: {
              lifecycleMutationApplied: false,
              canonicalEventPersisted: false,
              outboxPersisted: false,
            },
          },
        });

        const threadId = String(
          firstBody?.data?.thread?.threadId
            || firstBody?.data?.threadId
            || firstBody?.data?.correlation?.threadId
            || '',
        );
        expect(threadId.length).toBeGreaterThan(0);

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/threads/${threadId}`,
          headers: storyE5OperatorHeaders,
        });
        expect(detailResponse.status()).toBe(200);

        const detailBody = await detailResponse.json();
        expect(hasRequiredEnvelopeKeys(detailBody)).toBe(true);

        const timeline = Array.isArray(detailBody?.data?.thread?.timeline)
          ? (detailBody.data.thread.timeline as Array<{ eventName?: string }>)
          : [];
        const inboundSmsEvents = timeline.filter(
          (entry) => entry.eventName === 'connectshyft.inbound.sms_appended',
        );
        expect(inboundSmsEvents.length).toBe(1);
      },
    );

    test(
      '[E5-AUTOMATE-E2E-202][P1] retention cleanup run preserves active-window replay safety for subsequent duplicate deliveries @P1',
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

        const replayPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-e2e-202-${deterministicToken(testInfo, 'cleanup-replay-message')}`,
            providerEventId: deterministicProviderEventId(
              withStoryE5RunScope(storyE5Context, 'provider-event-e5-automate-e2e'),
              testInfo,
              'cleanup-replay-safe',
            ),
          }),
          neighborId: `neighbor-connectshyft-e5-automate-e2e-202-${deterministicToken(testInfo, 'cleanup-replay-neighbor')}`,
        };

        const firstResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e5-automate-e2e-202-first'),
          },
          data: replayPayload,
        });

        const duplicateResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e5-automate-e2e-202-duplicate'),
          },
          data: replayPayload,
        });

        const cleanupResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.receiptCleanup,
          headers: storyE5AdminHeaders,
          data: {
            ...storyE5CleanupRequestPayload,
            dryRun: false,
          },
        });

        const replayAfterCleanupResponse = await apiRequest(request, {
          method: 'POST',
          path: storyE5Context.paths.inboundWebhook,
          headers: {
            ...storyE5AdminHeaders,
            ...buildSignedWebhookHeaders(replayPayload, testInfo, 'e5-automate-e2e-202-post-cleanup-duplicate'),
          },
          data: replayPayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(duplicateResponse.status()).toBe(200);
        expect(cleanupResponse.status()).toBe(200);
        expect(replayAfterCleanupResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const duplicateBody = await duplicateResponse.json();
        const cleanupBody = await cleanupResponse.json();
        const replayAfterCleanupBody = await replayAfterCleanupResponse.json();

        expect(hasRequiredEnvelopeKeys(firstBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(duplicateBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(cleanupBody)).toBe(true);
        expect(hasRequiredEnvelopeKeys(replayAfterCleanupBody)).toBe(true);

        expect(cleanupBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.retentionApplied,
          data: {
            policyWindowDays: storyE5Context.receiptPolicyDays,
            dryRun: false,
            activeWindowProtected: true,
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
          },
        });

        expect(replayAfterCleanupBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.webhookAccepted,
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
              dedupeKey: expect.any(String),
            },
          },
        });

        expect(replayAfterCleanupBody?.data?.replaySafe?.dedupeKey).toBe(
          duplicateBody?.data?.replaySafe?.dedupeKey,
        );
      },
    );
  },
);
