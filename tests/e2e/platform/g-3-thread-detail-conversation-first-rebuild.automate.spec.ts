import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryG3Context,
  type StoryG3Context,
} from '../../support/factories/connectShyftStoryG3Factory';

const buildStoryG3UrlParams = (
  context: StoryG3Context,
  options: {
    actorUserId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: context.tenantId,
    orgUnitId: context.orgUnitId,
    actorUserId: options.actorUserId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  return params.toString();
};

const buildStoryG3ThreadDetailUrl = (
  context: StoryG3Context,
  threadId: string,
  options: {
    actorUserId?: string;
    tenantRole?: string;
    orgUnitMemberships?: string[];
  } = {},
): string => {
  const actorUserId = options.actorUserId ?? context.userId;
  const tenantRole = options.tenantRole ?? 'ORGUNIT_MEMBER';
  const orgUnitMemberships = options.orgUnitMemberships ?? [context.orgUnitId];

  return `${context.paths.threadDetailUi}/${threadId}?${buildStoryG3UrlParams(context, {
    actorUserId,
    tenantRole,
    orgUnitMemberships,
  })}`;
};

test.describe('Story g.3 Thread Detail Conversation-First Rebuild (Automate E2E Expansion)', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    '[G3-AUTO-E2E-201][P0] closed outbound send-message reopens same thread and requires override reason before dispatch @P0',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(context, context.threadIds.closedPrefersNo),
      );
      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Closed');

      await page.getByTestId('connectshyft-send-message-thread-action').click();

      await expect(page.getByTestId('connectshyft-thread-state-chip')).toHaveText('Unclaimed');
      await expect(page.getByTestId('connectshyft-thread-reopened-toast')).toContainText(/reopened/i);
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();
      await expect(page.getByTestId('connectshyft-preference-override-required-chip')).toBeVisible();
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toContainText(/override/i);
      await expect(page.getByTestId('connectshyft-preference-override-submit')).toBeDisabled();
      await expect(page.getByTestId('connectshyft-hidden-transition-warning')).toHaveCount(0);
    },
  );

  test(
    '[G3-AUTO-E2E-202][P1] override submission clears refusal state and surfaces contextual success plus audit metadata @P1',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(context, context.threadIds.unclaimedPrefersNo),
      );

      await page.getByTestId('connectshyft-send-text-thread-action').click();
      await expect(page.getByTestId('connectshyft-preference-override-modal')).toBeVisible();

      await page
        .getByTestId('connectshyft-preference-override-reason-select')
        .selectOption('safety-follow-up');
      await page
        .getByTestId('connectshyft-preference-override-note-input')
        .fill('Documented follow-up call requiring policy-compliant exception.');
      await page.getByTestId('connectshyft-preference-override-submit').click();

      await expect(page.getByTestId('connectshyft-preference-override-modal')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-policy-success-banner')).toContainText(
        /override applied|outbound message dispatched/i,
      );
      await expect(page.getByTestId('connectshyft-thread-action-feedback-contextual')).toContainText(
        /dispatch|override|success/i,
      );
      await expect(page.getByTestId('connectshyft-preference-override-audit-chip')).toContainText(
        'SAFETY-FOLLOW-UP',
      );
      await expect(page.getByTestId('connectshyft-policy-refusal-banner')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-policy-error-banner')).toHaveCount(0);
    },
  );

  test(
    '[G3-AUTO-E2E-203][P1] viewer role sees no lifecycle actions and receives deterministic access-level refusal guidance @P1',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(
          context,
          context.threadIds.claimed,
          {
            actorUserId: context.viewerUserId,
            tenantRole: 'TENANT_VIEWER',
            orgUnitMemberships: [],
          },
        ),
      );

      await expect(page.getByTestId('connectshyft-thread-action-refusal-banner')).toContainText(
        /unavailable for your access level/i,
      );
      await expect(page.getByTestId('connectshyft-thread-action-label')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-send-text-thread-action')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-send-message-thread-action')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-call-thread-action')).toHaveCount(0);
    },
  );

  test(
    '[G3-AUTO-E2E-204][P1] non-voicemail claimed timelines keep conversation events without synthesizing voicemail entries @P1',
    async ({ page }) => {
      const context = createStoryG3Context();
      await login(page);

      await page.goto(
        buildStoryG3ThreadDetailUrl(context, context.threadIds.claimed),
      );

      await expect(page.getByTestId('connectshyft-thread-timeline')).toBeVisible();
      await expect(page.getByTestId('connectshyft-thread-timeline-event-voicemail')).toHaveCount(0);

      const timelineEventCount = await page.getByTestId('connectshyft-thread-timeline-event').count();
      expect(timelineEventCount).toBeGreaterThan(0);
    },
  );
});
