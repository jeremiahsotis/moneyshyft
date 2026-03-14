import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import { buildSmsWebhookPayload } from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  ensureStoryE5NumberMapping,
  loadStoryE5ReceiptMetrics,
  postStoryE5InboundWebhook,
  runStoryE5ReceiptCleanup,
  withStoryE5RunScope,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (Automate API Expansion) - Case 103',
  () => {
    test(
      '[E5-AUTOMATE-API-103][P1] cleanup dry-run preserves row totals while reporting active replay-safety protection @P1',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
        storyE5CleanupRequestPayload,
      }, testInfo) => {
        await ensureStoryE5NumberMapping({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          numberMappingPayload: storyE5NumberMappingPayload,
        });

        const seedPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-automate-api-103-${deterministicToken(testInfo, 'cleanup-seed-message')}`,
            providerEventId: deterministicProviderEventId(
              withStoryE5RunScope(storyE5Context, 'provider-event-e5-automate-api'),
              testInfo,
              'cleanup-seed',
            ),
          }),
          neighborId: `neighbor-connectshyft-e5-automate-api-103-${deterministicToken(testInfo, 'cleanup-seed-neighbor')}`,
        };

        await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: seedPayload,
          testInfo,
          signatureLabel: 'e5-automate-api-103-seed',
        });

        const { body: preMetricsBody } = await loadStoryE5ReceiptMetrics({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
        });

        const { body: cleanupBody } = await runStoryE5ReceiptCleanup({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          cleanupPayload: {
            ...storyE5CleanupRequestPayload,
            dryRun: true,
          },
        });

        const { body: postMetricsBody } = await loadStoryE5ReceiptMetrics({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
        });

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
