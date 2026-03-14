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

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD API RED) - Case 001',
  () => {
    test(
      '[E5-ATDD-API-001][P0] suppresses duplicate domain writes with unique (tenant, provider, sid, eventType) receipt identity @P0',
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

        const providerEventId = deterministicProviderEventId(
          withStoryE5RunScope(storyE5Context, 'provider-event-e5-atdd-api'),
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
          neighborId: '04eccf46-0c56-495f-8d01-6c4f819548dd',
        };

        const { body: firstBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: replayPayload,
          testInfo,
          signatureLabel: 'e5-atdd-api-001-first',
        });
        const { body: duplicateBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: replayPayload,
          testInfo,
          signatureLabel: 'e5-atdd-api-001-duplicate',
        });

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
  },
);
