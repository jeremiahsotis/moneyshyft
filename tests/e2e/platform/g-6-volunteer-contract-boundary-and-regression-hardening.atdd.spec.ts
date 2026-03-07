import { test, expect, type Page } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG6SurfaceUrl,
  buildStoryG6ThreadDetailUrl,
  createStoryG6Context,
  createStoryG6Headers,
  type StoryG6Context,
} from '../../support/factories/connectShyftStoryG6Factory';

type ViewportScenario = {
  id: string;
  label: string;
  breakpoint: keyof StoryG6Context['breakpoints'];
  layoutTestId: string;
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const context = createStoryG6Context();

const volunteerActor = {
  role: 'ORGUNIT_MEMBER',
  userId: context.userId,
  orgUnitMemberships: [context.orgUnitId],
};

const VIEWPORT_SCENARIOS: ViewportScenario[] = [
  {
    id: 'G6-ATDD-E2E-004A',
    label: 'mobile',
    breakpoint: 'mobile',
    layoutTestId: 'connectshyft-layout-mobile-thread-fullscreen',
  },
  {
    id: 'G6-ATDD-E2E-004B',
    label: 'tablet',
    breakpoint: 'tablet',
    layoutTestId: 'connectshyft-layout-tablet-split',
  },
  {
    id: 'G6-ATDD-E2E-004C',
    label: 'desktop',
    breakpoint: 'desktop',
    layoutTestId: 'connectshyft-layout-desktop-three-column',
  },
];

const collectVisibleSurfaceCopy = async (scopeTestId: string, page: Page): Promise<string> => {
  const surfaceCopy = (await page.getByTestId(scopeTestId).textContent()) ?? '';
  return surfaceCopy.toLowerCase();
};

test.describe('Story g.6 Volunteer Contract Boundary and Regression Hardening (ATDD E2E RED)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test(
    '[G6-ATDD-E2E-001][P0] volunteer-primary Inbox and Mine surfaces render display-safe contracts and suppress admin/system-first metadata chips @P0',
    async ({ page }) => {
      await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();

      const inboxCopy = await collectVisibleSurfaceCopy('connectshyft-inbox-surface', page);
      for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
        expect(inboxCopy).not.toContain(forbiddenToken);
      }
      expect(inboxCopy).not.toMatch(UUID_PATTERN);

      await expect(page.getByTestId('connectshyft-thread-id-chip')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-raw-state-chip')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-system-metadata-chip')).toHaveCount(0);

      await page.goto(buildStoryG6SurfaceUrl(context, 'mine', volunteerActor));
      await expect(page.getByTestId('connectshyft-inbox-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-queue-card').first()).toBeVisible();

      const mineCopy = await collectVisibleSurfaceCopy('connectshyft-inbox-surface', page);
      for (const forbiddenToken of context.forbiddenPrimaryCopyTokens) {
        expect(mineCopy).not.toContain(forbiddenToken);
      }
      expect(mineCopy).not.toMatch(UUID_PATTERN);
    },
  );

  test(
    '[G6-ATDD-E2E-002][P0] voicemail behavior lock keeps voicemail ownership stable in Mine and preserves conversation-first timeline treatment @P0',
    async ({ page }) => {
      await page.goto(buildStoryG6SurfaceUrl(context, 'mine', volunteerActor));

      const voicemailCard = page.getByTestId(
        `connectshyft-thread-card-${context.threadIds.mineVoicemail}`,
      );
      await expect(voicemailCard).toBeVisible();
      await expect(
        page.getByTestId(`connectshyft-voicemail-indicator-${context.threadIds.mineVoicemail}`),
      ).toBeVisible();

      await voicemailCard.getByTestId('connectshyft-queue-card-tap-target').click();
      await page.goto(
        buildStoryG6ThreadDetailUrl(context, context.threadIds.mineVoicemail, volunteerActor),
      );
      await expect(page.getByTestId('connectshyft-thread-surface')).toBeVisible();
      await expect(
        page.getByTestId('connectshyft-thread-timeline-event-voicemail').first(),
      ).toBeVisible();

      await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
      await expect(
        page.getByTestId(`connectshyft-thread-card-${context.threadIds.mineVoicemail}`),
      ).toHaveCount(0);
    },
  );

  test(
    '[G6-ATDD-E2E-003][P0] CLOSED outbound actions preserve same-thread reopen semantics with deterministic volunteer feedback and no contradictory messaging @P0',
    async ({ page }) => {
      await page.goto(
        buildStoryG6ThreadDetailUrl(context, context.threadIds.closedOutbound, volunteerActor),
      );

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Closed');
      await page.getByTestId('connectshyft-send-message-thread-action').click();

      await expect(page).toHaveURL(
        new RegExp(`/app/connectshyft/threads/${context.threadIds.closedOutbound}`),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(/reopened/i);
      await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-thread-inbound-auto-reopen-indicator')).toHaveCount(0);
    },
  );

  for (const viewport of VIEWPORT_SCENARIOS) {
    test(
      `[${viewport.id}][P1] volunteer thread interaction model remains locked to expected ${viewport.label} responsive layout contract @P1`,
      async ({ page }) => {
        const breakpoint = context.breakpoints[viewport.breakpoint];
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });

        await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));
        const tapTarget = page.getByTestId('connectshyft-queue-card-tap-target').first();
        await expect(tapTarget).toBeVisible();
        await tapTarget.click();

        await expect(page.getByTestId(viewport.layoutTestId)).toBeVisible();

        if (viewport.breakpoint === 'mobile') {
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeHidden();
        }

        if (viewport.breakpoint === 'tablet') {
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-thread-panel')).toBeVisible();
        }

        if (viewport.breakpoint === 'desktop') {
          await expect(page.getByTestId('connectshyft-queue-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-thread-panel')).toBeVisible();
          await expect(page.getByTestId('connectshyft-tertiary-panel')).toBeVisible();
        }
      },
    );
  }

  test(
    '[G6-ATDD-E2E-005][P1] volunteer keyboard traversal and feedback semantics satisfy accessibility and action-feedback consistency contracts @P1',
    async ({ page }) => {
      await page.goto(buildStoryG6SurfaceUrl(context, 'inbox', volunteerActor));

      for (const testId of context.focusOrder) {
        await expect(page.getByTestId(testId).first()).toHaveAttribute('aria-label', /.+/);
      }

      const observedFocusOrder: string[] = [];
      for (let index = 0; index < context.focusOrder.length; index += 1) {
        await page.keyboard.press('Tab');
        observedFocusOrder.push(
          await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? ''),
        );
      }

      expect(observedFocusOrder).toEqual([...context.focusOrder]);
      await expect(page.getByTestId('connectshyft-live-region-status')).toHaveAttribute(
        'aria-live',
        'polite',
      );

      await page.goto(
        buildStoryG6ThreadDetailUrl(context, context.threadIds.closedOutbound, volunteerActor),
      );
      await page.getByTestId('connectshyft-send-message-thread-action').click();
      await expect(page.getByTestId('connectshyft-feedback-banner')).toHaveAttribute(
        'data-feedback-taxonomy',
        /(success|refusal|error)/,
      );
    },
  );

  test(
    '[G6-ATDD-E2E-006][P0] inbound activity on CLOSED threads keeps volunteer UI locked and never auto-reopens thread state @P0',
    async ({ page }) => {
      const webhookResponse = await page.request.post(context.paths.inboundWebhook, {
        headers: createStoryG6Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.adminUserId,
          orgUnitMemberships: [context.orgUnitId],
        }),
        data: {
          provider: 'telnyx',
          providerEventId: `provider-event-g6-e2e-${Date.now()}`,
          providerLegId: `leg-g6-e2e-${Date.now()}`,
          eventType: context.events.inboundMissedCall,
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          threadId: context.threadIds.closedInbound,
          neighborId: context.neighborIds.closedInbound,
          payload: {
            missedCall: true,
          },
        },
      });

      expect(webhookResponse.status()).toBe(200);

      await page.goto(
        buildStoryG6ThreadDetailUrl(context, context.threadIds.closedInbound, volunteerActor),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toContainText('Closed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-thread-inbound-auto-reopen-indicator')).toHaveCount(0);
    },
  );
});
