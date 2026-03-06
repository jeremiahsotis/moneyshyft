import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import {
  loadStoryE5ReceiptMetrics,
  runStoryE5ReceiptCleanup,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD API RED) - Case 003',
  () => {
    test(
      '[E5-ATDD-API-003][P1] retention cleanup removes expired receipt rows while preserving active replay-safe window @P1',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5CleanupRequestPayload,
      }) => {
        const { body: preCleanupMetricsBody } = await loadStoryE5ReceiptMetrics({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
        });

        const { body: cleanupBody } = await runStoryE5ReceiptCleanup({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          cleanupPayload: storyE5CleanupRequestPayload,
        });

        const { body: metricsBody } = await loadStoryE5ReceiptMetrics({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
        });

        expect(preCleanupMetricsBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.metricsLoaded,
        });
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
  },
);
