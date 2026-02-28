import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryF2Context,
  type StoryF2Context,
} from '../../support/factories/connectShyftStoryF2Factory';

const buildThreadUrl = (
  context: StoryF2Context,
  options: {
    threadId: string;
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    providerKey: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    providerKey: options.providerKey,
  });

  return `${context.paths.threadDetailUi}/${options.threadId}?${params.toString()}`;
};

test.describe(
  'Story f.2 Canonical Comms Event Model and Event Store (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] thread detail timeline renders canonical event rows with provider-neutral labels and deterministic chronological ordering @P0',
      async ({ page }) => {
        const context = createStoryF2Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.enabledPrimary,
          }),
        );

        await expect(page.getByTestId('connectshyft-thread-timeline')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-timeline-item')).toHaveCount(3);
        await expect(page.getByTestId('connectshyft-thread-timeline-item').first()).toContainText(
          /CallAttemptStarted|MessageQueued|CallConnected/i,
        );
        await expect(page.getByTestId('connectshyft-thread-timeline-order-badge')).toContainText(
          /ordered by utc timestamp/i,
        );
        await expect(page.getByTestId('connectshyft-provider-specific-leak-banner')).toHaveCount(0);
      },
    );

    test.skip(
      '[P1] operator debug events panel filters by aggregate id and canonical event type while preserving deterministic result ordering @P1',
      async ({ page }) => {
        const context = createStoryF2Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.enabledPrimary,
          }),
        );

        await expect(page.getByTestId('connectshyft-events-debug-panel')).toBeVisible();
        await page
          .getByTestId('connectshyft-events-filter-aggregate-id')
          .fill(context.threadIds.unclaimed);
        await page
          .getByTestId('connectshyft-events-filter-event-type')
          .selectOption(context.canonicalEventTypes.callConnected);
        await page.getByTestId('connectshyft-events-filter-apply').click();

        await expect(page.getByTestId('connectshyft-events-results-row').first()).toContainText(
          context.canonicalEventTypes.callConnected,
        );
        await expect(page.getByTestId('connectshyft-events-results-order-chip')).toContainText(
          /occurred_at_utc asc.*event_id asc/i,
        );
      },
    );

    test.skip(
      '[P1] status and timeline summary chips remain provider-neutral and event-derived without twilio or telnyx naming leakage @P1',
      async ({ page }) => {
        const context = createStoryF2Context();
        await login(page);

        await page.goto(
          buildThreadUrl(context, {
            threadId: context.threadIds.unclaimed,
            actorUserId: context.userId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.orgUnitId],
            providerKey: context.providers.enabledPrimary,
          }),
        );

        await expect(page.getByTestId('connectshyft-status-derived-from-events-chip')).toContainText(
          /derived from canonical events/i,
        );
        await expect(page.getByTestId('connectshyft-provider-neutral-contract-chip')).toContainText(
          /provider neutral/i,
        );
        await expect(page.getByTestId('connectshyft-provider-name-twilio')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-provider-name-telnyx')).toHaveCount(0);
      },
    );
  },
);
