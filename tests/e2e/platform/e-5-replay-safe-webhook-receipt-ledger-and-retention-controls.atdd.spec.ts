import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryE5Context,
  createStoryE5Headers,
} from '../../support/factories/connectShyftStoryE5Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';
import {
  buildSignedWebhookHeaders,
  buildSmsWebhookPayload,
} from '../../support/helpers/connectShyftWebhookTestHelpers';

test.describe(
  'Story e.5 Replay-Safe Webhook Receipt Ledger and Retention Controls (ATDD E2E RED)',
  () => {
    test.skip(
      '[E5-ATDD-E2E-001][P1] operator timeline shows one inbound artifact with replay-safe duplicate suppression indicator under duplicate bursts @P1',
      async ({ page, request }, testInfo) => {
        const context = createStoryE5Context();
        const adminHeaders = createStoryE5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            providerNumberE164: context.numbers.mappedInbound,
            label: 'Story e.5 timeline replay-safe number',
            isActive: true,
          },
        });

        const replayPayload = buildSmsWebhookPayload({
          providerKey: context.providers.enabledPrimary,
          to: context.numbers.mappedInbound,
          from: context.numbers.mappedOutbound,
          providerMessageId: `msg-e5-atdd-e2e-${deterministicToken(testInfo, 'timeline-message')}`,
          providerEventId: deterministicProviderEventId(
            'provider-event-e5-atdd-e2e',
            testInfo,
            'timeline-duplicate',
          ),
        });

        await Promise.all(
          Array.from({ length: 6 }).map((_, index) =>
            apiRequest(request, {
              method: 'POST',
              path: context.paths.inboundWebhook,
              headers: {
                ...adminHeaders,
                ...buildSignedWebhookHeaders(
                  replayPayload,
                  testInfo,
                  `e5-atdd-e2e-001-${index}`,
                ),
              },
              data: replayPayload,
            })),
        );

        await page.goto(
          `${context.paths.threadDetailUi}?tenantId=${context.tenantId}&orgUnitId=${context.orgUnitId}&tenantRole=ORGUNIT_MEMBER&flags=module:on,inbox:on,escalation:on,webhooks:on`,
        );

        await expect(
          page.getByTestId('connectshyft-thread-timeline'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-event-row-inbound-webhook'),
        ).toHaveCount(1);
        await expect(
          page.getByTestId('connectshyft-replay-safe-duplicate-badge'),
        ).toContainText('Duplicate suppressed');
        await expect(
          page.getByTestId('connectshyft-receipt-ledger-key-chip'),
        ).toContainText('tenant/provider/sid/eventType');
      },
    );

    test.skip(
      '[E5-ATDD-E2E-002][P2] retention controls screen exposes active window and cleanup outcomes without rendering expired receipt rows @P2',
      async ({ page, request }) => {
        const context = createStoryE5Context();
        const adminHeaders = createStoryE5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.receiptCleanup,
          headers: adminHeaders,
          data: {
            policyWindowDays: context.receiptPolicyDays,
            dryRun: false,
          },
        });

        await page.goto(
          `${context.paths.receiptControlsUi}?tenantId=${context.tenantId}&orgUnitId=${context.orgUnitId}&tenantRole=ORGUNIT_ADMIN&flags=module:on,inbox:on,escalation:on,webhooks:on`,
        );

        await expect(
          page.getByRole('heading', { name: 'Webhook Receipt Retention Controls' }),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-retention-window-days'),
        ).toHaveText(String(context.receiptPolicyDays));
        await expect(
          page.getByTestId('connectshyft-receipt-cleanup-run-result'),
        ).toContainText('expired receipts removed');
        await expect(
          page.getByTestId('connectshyft-replay-safety-window-status'),
        ).toContainText('active window protected');
      },
    );
  },
);
