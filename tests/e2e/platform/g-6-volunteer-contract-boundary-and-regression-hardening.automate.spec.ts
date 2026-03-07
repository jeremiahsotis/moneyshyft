import {
  test,
  expect,
  type Page,
  type TestInfo,
} from '../../support/fixtures/connectShyftStoryG6E2e.fixture';
import {
  buildStoryG6SurfaceUrl,
  buildStoryG6ThreadDetailUrl,
  createStoryG6Context,
  createStoryG6Headers,
} from '../../support/factories/connectShyftStoryG6Factory';
import {
  deterministicProviderEventId,
  deterministicToken,
} from '../../support/utils/deterministicTestIds';

type InboundWebhookEnvelope = {
  ok?: boolean;
  code?: string;
  data?: {
    replaySafe?: {
      duplicate?: boolean;
      suppressedDomainWrites?: boolean;
      dedupeKey?: string | null;
    };
  };
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const context = createStoryG6Context();

const volunteerActor = {
  role: 'ORGUNIT_MEMBER',
  userId: context.userId,
  orgUnitMemberships: [context.orgUnitId],
};

const tenantViewerActor = {
  role: 'TENANT_VIEWER',
  userId: context.viewerUserId,
  orgUnitMemberships: [],
};

const restrictedActor = {
  role: 'CONNECTSHYFT_GUEST',
  userId: 'user-connectshyft-g6-guest',
  orgUnitMemberships: [context.orgUnitId],
};

const collectVisibleSurfaceCopy = async (scopeTestId: string, page: Page): Promise<string> => {
  const surfaceCopy = (await page.getByTestId(scopeTestId).textContent()) ?? '';
  return surfaceCopy.toLowerCase();
};

test.describe(
  'Story g.6 Volunteer Contract Boundary and Regression Hardening (Automate E2E Expansion)',
  () => {
    test(
      '[G6-AUTO-E2E-301][P0] tenant-privileged volunteer inbox surface stays available without orgUnit membership and still suppresses internal metadata chips @P0',
      async ({ page }) => {
        await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', tenantViewerActor));

        await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();
        await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();
        await expect(page.getByTestId('connectshyft-unavailable-state')).toHaveCount(0);

        const inboxCopy = await collectVisibleSurfaceCopy('connectshyft-inbox-surface', page);
        for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
          expect(inboxCopy).not.toContain(forbiddenToken);
        }
        expect(inboxCopy).not.toMatch(UUID_PATTERN);

        await expect(page.getByTestId('connectshyft-thread-id-chip')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-raw-state-chip')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-system-metadata-chip')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-add-neighbor-action')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-compose-message-action')).toBeDisabled();
        await expect(page.getByTestId('connectshyft-make-call-action')).toBeDisabled();
      },
    );

    test(
      '[G6-AUTO-E2E-302][P0] non-capability actor thread-detail route renders deterministic refusal feedback with no action surface leakage @P0',
      async ({ page }) => {
        await page.goto(
          buildStoryG6ThreadDetailUrl(context, context.threadIds.closedOutbound, restrictedActor),
        );

        const feedbackBanner = page.getByTestId('connectshyft-feedback-banner');
        await expect(feedbackBanner).toBeVisible();
        await expect(feedbackBanner).toHaveAttribute('data-feedback-taxonomy', 'error');
        await expect(feedbackBanner).toContainText(/thread access requires an authorized connectshyft role/i);

        await expect(page.getByTestId('connectshyft-thread-primary-context-panel')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-send-message-thread-action')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-send-text-thread-action')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-call-thread-action')).toHaveCount(0);
      },
    );

    test(
      '[G6-AUTO-E2E-303][P1] mobile full-screen thread layout exits cleanly back to queue without stale responsive markers @P1',
      async ({ page }) => {
        const breakpoint = context.breakpoints.mobile;
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });

        await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
        await page.getByTestId('connectshyft-queue-card-tap-target').first().click();

        await expect(page.getByTestId('connectshyft-layout-mobile-thread-fullscreen')).toBeVisible();
        await expect(page.getByTestId('connectshyft-thread-panel-back')).toBeVisible();
        await expect(page.getByTestId('connectshyft-queue-panel')).toBeHidden();

        await page.getByTestId('connectshyft-thread-panel-back').click();

        await expect(page.getByTestId('connectshyft-layout-mobile-thread-fullscreen')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-thread-panel-back')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
        await expect(page.getByTestId('connectshyft-queue-search-input')).toBeVisible();
      },
    );

    test(
      '[G6-AUTO-E2E-304][P1] outbound override refusal feedback remains taxonomy-consistent and sanitized from internal identifiers @P1',
      async ({ page }) => {
        await page.goto(
          buildStoryG6ThreadDetailUrl(context, context.threadIds.unclaimedPrefersNo, volunteerActor),
        );

        await page.getByTestId('connectshyft-send-text-thread-action').click();

        const feedbackBanner = page.getByTestId('connectshyft-feedback-banner');
        const refusalBanner = page.getByTestId('connectshyft-policy-refusal-banner');
        await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
        await expect(feedbackBanner).toHaveAttribute('data-feedback-taxonomy', 'refusal');
        await expect(refusalBanner).toBeVisible();

        const feedbackCopy = ((await feedbackBanner.textContent()) ?? '').toLowerCase();
        const refusalCopy = ((await refusalBanner.textContent()) ?? '').toLowerCase();
        for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
          expect(feedbackCopy).not.toContain(forbiddenToken);
          expect(refusalCopy).not.toContain(forbiddenToken);
        }
        expect(feedbackCopy).not.toMatch(UUID_PATTERN);
        expect(refusalCopy).not.toMatch(UUID_PATTERN);

        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
      },
    );

    test(
      '[G6-AUTO-E2E-305][P1] duplicate CLOSED inbound webhook events keep volunteer thread state locked with replay-safe suppression and no auto-reopen cues @P1',
      async ({ page }, testInfo: TestInfo) => {
        const webhookPayload = {
          provider: 'telnyx',
          providerEventId: deterministicProviderEventId(
            'provider-event-g6-e2e-duplicate',
            testInfo,
            'g6-auto-e2e-305-event',
          ),
          providerLegId: `leg-g6-e2e-duplicate-${deterministicToken(
            testInfo,
            'g6-auto-e2e-305-leg',
          )}`,
          eventType: context.events.inboundMissedCall,
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId: context.threadIds.closedInbound,
          neighborId: context.neighborIds.closedInbound,
          payload: {
            missedCall: true,
          },
        };

        const adminHeaders = createStoryG6Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const firstWebhookResponse = await page.request.post(context.paths.inboundWebhook, {
          headers: adminHeaders,
          data: webhookPayload,
        });
        const duplicateWebhookResponse = await page.request.post(context.paths.inboundWebhook, {
          headers: adminHeaders,
          data: webhookPayload,
        });

        expect(firstWebhookResponse.status()).toBe(200);
        expect(duplicateWebhookResponse.status()).toBe(200);

        const duplicateBody = (await duplicateWebhookResponse.json()) as InboundWebhookEnvelope;
        expect(duplicateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_WEBHOOK_ACCEPTED',
          data: {
            replaySafe: {
              duplicate: true,
              suppressedDomainWrites: true,
            },
          },
        });

        await page.goto(
          buildStoryG6ThreadDetailUrl(context, context.threadIds.closedInbound, volunteerActor),
        );
        await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('Closed');
        await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-thread-inbound-auto-reopen-indicator')).toHaveCount(0);
      },
    );
  },
);
