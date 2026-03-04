import { test, expect } from '../../support/fixtures/connectShyftStoryE5.fixture';
import { login } from '../../helpers/auth';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import { buildSmsWebhookPayload } from '../../support/helpers/connectShyftWebhookTestHelpers';
import {
  buildStoryE5ThreadDetailUrl,
  countStoryE5TimelineEvents,
  ensureStoryE5NumberMapping,
  extractStoryE5ThreadId,
  fetchStoryE5ThreadDetail,
  loadStoryE5ReceiptMetrics,
  postStoryE5InboundWebhook,
  runStoryE5ReceiptCleanup,
  withStoryE5RunScope,
} from '../../support/helpers/connectShyftStoryE5TestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD E2E)',
  () => {
    test(
      '[E5-ATDD-E2E-001][P1] operator thread detail reflects one inbound artifact after duplicate burst replay suppression @P1',
      async ({
        page,
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5OperatorHeaders,
        storyE5NumberMappingPayload,
      }, testInfo) => {
        await ensureStoryE5NumberMapping({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          numberMappingPayload: storyE5NumberMappingPayload,
        });

        const replayPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-atdd-e2e-${deterministicToken(testInfo, 'timeline-message')}`,
            providerEventId: deterministicProviderEventId(
              withStoryE5RunScope(storyE5Context, 'provider-event-e5-atdd-e2e'),
              testInfo,
              'timeline-duplicate',
            ),
          }),
          neighborId: `neighbor-connectshyft-e5-atdd-e2e-001-${deterministicToken(testInfo, 'timeline-neighbor')}`,
        };

        const replayResults = await Promise.all(
          Array.from({ length: 6 }).map((_, index) =>
            postStoryE5InboundWebhook({
              request,
              context: storyE5Context,
              adminHeaders: storyE5AdminHeaders,
              payload: replayPayload,
              testInfo,
              signatureLabel: `e5-atdd-e2e-001-${index}`,
            })),
        );

        const replayBodies = replayResults.map((result) => result.body);
        const firstSeenBodies = replayBodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === false,
        );
        const duplicateBodies = replayBodies.filter(
          (body) => body?.data?.replaySafe?.duplicate === true,
        );

        expect(firstSeenBodies).toHaveLength(1);
        expect(duplicateBodies).toHaveLength(5);

        const firstSeenBody = firstSeenBodies[0];
        expect(firstSeenBody).toBeTruthy();

        const threadId = extractStoryE5ThreadId(firstSeenBody);
        const { body: detailBody } = await fetchStoryE5ThreadDetail({
          request,
          context: storyE5Context,
          headers: storyE5OperatorHeaders,
          threadId,
        });

        expect(countStoryE5TimelineEvents(detailBody, 'connectshyft.inbound.sms_appended')).toBe(1);

        await login(page);
        const detailRequest = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${threadId}`)
            && response.request().method() === 'GET',
        );
        await page.goto(
          buildStoryE5ThreadDetailUrl({
            context: storyE5Context,
            threadId,
            actorUserId: storyE5Context.userId,
          }),
        );
        await detailRequest;

        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(threadId);
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toBeVisible();
      },
    );

    test(
      '[E5-ATDD-E2E-002][P2] retention cleanup preserves active replay-safe dedupe identity and thread detail renders current metadata @P2',
      async ({
        page,
        request,
        storyE5Context,
        storyE5AdminHeaders,
        storyE5OperatorHeaders,
        storyE5NumberMappingPayload,
        storyE5CleanupRequestPayload,
      }, testInfo) => {
        await ensureStoryE5NumberMapping({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          numberMappingPayload: storyE5NumberMappingPayload,
        });

        const replayPayload = {
          ...buildSmsWebhookPayload({
            providerKey: storyE5Context.providers.enabledPrimary,
            to: storyE5Context.numbers.mappedInbound,
            from: storyE5Context.numbers.mappedOutbound,
            providerMessageId: `msg-e5-atdd-e2e-002-${deterministicToken(testInfo, 'retention-message')}`,
            providerEventId: deterministicProviderEventId(
              withStoryE5RunScope(storyE5Context, 'provider-event-e5-atdd-e2e'),
              testInfo,
              'retention-replay-safe',
            ),
          }),
          neighborId: `neighbor-connectshyft-e5-atdd-e2e-002-${deterministicToken(testInfo, 'retention-neighbor')}`,
        };

        const { body: firstBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: replayPayload,
          testInfo,
          signatureLabel: 'e5-atdd-e2e-002-first',
        });

        const { body: cleanupBody } = await runStoryE5ReceiptCleanup({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          cleanupPayload: {
            ...storyE5CleanupRequestPayload,
            dryRun: false,
          },
        });

        const { body: replayAfterCleanupBody } = await postStoryE5InboundWebhook({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
          payload: replayPayload,
          testInfo,
          signatureLabel: 'e5-atdd-e2e-002-post-cleanup-duplicate',
        });

        const { body: metricsBody } = await loadStoryE5ReceiptMetrics({
          request,
          context: storyE5Context,
          adminHeaders: storyE5AdminHeaders,
        });

        expect(cleanupBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.retentionApplied,
          data: {
            policyWindowDays: storyE5Context.receiptPolicyDays,
            dryRun: false,
            activeWindowProtected: true,
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
          firstBody?.data?.replaySafe?.dedupeKey,
        );

        expect(metricsBody).toMatchObject({
          ok: true,
          code: storyE5Context.codes.metricsLoaded,
          data: {
            retentionWindowDays: storyE5Context.receiptPolicyDays,
            totalRows: expect.any(Number),
          },
        });

        const threadId = extractStoryE5ThreadId(firstBody);
        const { body: detailBody } = await fetchStoryE5ThreadDetail({
          request,
          context: storyE5Context,
          headers: storyE5OperatorHeaders,
          threadId,
        });

        expect(countStoryE5TimelineEvents(detailBody, 'connectshyft.inbound.sms_appended')).toBe(1);

        await login(page);
        const detailRequest = page.waitForResponse(
          (response) =>
            response.url().includes(`/api/v1/connectshyft/threads/${threadId}`)
            && response.request().method() === 'GET',
        );
        await page.goto(
          buildStoryE5ThreadDetailUrl({
            context: storyE5Context,
            threadId,
            actorUserId: storyE5Context.adminUserId,
            tenantRole: 'ORGUNIT_ADMIN',
          }),
        );
        await detailRequest;

        await expect(page.getByTestId('connectshyft-thread-detail')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-id-chip')).toContainText(threadId);
        await expect(
          page.getByTestId('connectshyft-thread-metadata-last-inbound-number'),
        ).toBeVisible();
      },
    );
  },
);
