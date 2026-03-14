import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import { buildSmsWebhookPayload } from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  ensureStoryE5NumberMapping,
  postStoryE5InboundWebhook,
  withStoryE5RunScope,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

const STORY_E5_LATENCY_TOLERANCE_MS = Number.parseInt(
  process.env.E5_LATENCY_TOLERANCE_MS ?? '120',
  10,
);

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD API RED) - Case 004',
  () => {
    test(
      '[E5-ATDD-API-004][P0] duplicate burst handling remains deterministic and within webhook latency budget @P0',
      async ({
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        await ensureStoryE5NumberMapping({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          numberMappingPayload: storyE5NumberMappingPayload,
        });

        const burstPayload = buildSmsWebhookPayload({
          providerKey: storyE5Context.providers.enabledPrimary,
          to: storyE5Context.numbers.mappedInbound,
          from: storyE5Context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-burst-${deterministicToken(testInfo, 'burst-message')}`,
          providerEventId: deterministicProviderEventId(
            withStoryE5RunScope(storyE5Context, 'provider-event-e5-atdd-api'),
            testInfo,
            'burst-duplicate',
          ),
        });
        const duplicateBurstPayload = {
          ...burstPayload,
          neighborId: '4b658da7-8aad-40da-8634-0df01a65170c',
        };

        const startedAtMs = performance.now();
        const burstResults = await Promise.all(
          Array.from({ length: storyE5Context.duplicateBurstCount }).map((_, index) =>
            postStoryE5InboundWebhook({
              request,
              context: storyE5Context,
              adminHeaders: storyE5AdminHeaders,
              payload: duplicateBurstPayload,
              testInfo,
              signatureLabel: `e5-atdd-api-004-${index}`,
            })),
        );
        const elapsedMs = performance.now() - startedAtMs;

        const bodies = burstResults.map((result) => result.body);
        const firstSeenCount = bodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === false,
        ).length;
        const duplicateCount = bodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === true,
        ).length;

        expect(firstSeenCount).toBe(1);
        expect(duplicateCount).toBe(storyE5Context.duplicateBurstCount - 1);

        const latencyBudgetMs =
          storyE5Context.latencyBudgetMs
          + (Number.isFinite(STORY_E5_LATENCY_TOLERANCE_MS)
            ? STORY_E5_LATENCY_TOLERANCE_MS
            : 120);

        expect(elapsedMs).toBeLessThanOrEqual(latencyBudgetMs);
      },
    );
  },
);
