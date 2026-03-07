import { test as base, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG5AdminPathUrl,
  buildStoryG5MoreUrl,
  createStoryG5Context,
  type StoryG5Context,
} from '../../support/factories/connectShyftStoryG5Factory';

type StoryG5Fixtures = {
  storyG5Context: StoryG5Context;
};

type StoryG5WorkerFixtures = {
  storyG5StorageState: Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;
};

const test = base.extend<StoryG5Fixtures, StoryG5WorkerFixtures>({
  storyG5Context: async ({}, use) => {
    await use(createStoryG5Context());
  },
  storyG5StorageState: [
    async ({ browser }, use) => {
      const authContext = await browser.newContext({
        baseURL: process.env.BASE_URL || 'http://localhost:5174',
      });
      const authPage = await authContext.newPage();
      await login(authPage);
      await use(await authContext.storageState());
      await authContext.close();
    },
    { scope: 'worker' },
  ],
  storageState: async ({ storyG5StorageState }, use) => {
    await use(storyG5StorageState);
  },
});

const NO_REFUSAL_QUERY_KEYS = /^((?!settingsRefusal|settingsRefusedPath).)*$/;

const VIEWPORT_SCENARIOS = [
  {
    id: 'G5-ATDD-E2E-005A',
    label: 'mobile',
    breakpoint: 'mobile',
    layoutTestId: 'connectshyft-more-layout-mobile',
  },
  {
    id: 'G5-ATDD-E2E-005B',
    label: 'tablet',
    breakpoint: 'tablet',
    layoutTestId: 'connectshyft-more-layout-tablet',
  },
  {
    id: 'G5-ATDD-E2E-005C',
    label: 'desktop',
    breakpoint: 'desktop',
    layoutTestId: 'connectshyft-more-layout-desktop',
  },
] as const;

test.describe('Story g.5 More/Settings Volunteer IA and Admin Separation (ATDD E2E)', () => {
  test(
    '[G5-ATDD-E2E-001][P0] volunteer More/Settings shows volunteer-first IA options and excludes admin controls @P0',
    async ({ page, storyG5Context }) => {
      await page.goto(buildStoryG5MoreUrl(storyG5Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG5Context.volunteerUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-more-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-directory')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-settings')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-settings')).toHaveAttribute(
        'href',
        /\/app\/connectshyft\/settings/,
      );
      await expect(page.getByTestId('connectshyft-more-option-notifications')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-display-preferences')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-sign-out')).toBeVisible();

      await expect(page.getByTestId('connectshyft-more-admin-option-availability')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-more-admin-option-numbers')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-more-admin-option-escalation')).toHaveCount(0);
    },
  );

  test(
    '[G5-ATDD-E2E-002][P0] volunteer deep-link to admin settings path returns refusal guidance and withholds privileged controls @P0',
    async ({ page, storyG5Context }) => {
      await page.goto(buildStoryG5AdminPathUrl(storyG5Context, storyG5Context.paths.moreAvailabilityUi, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG5Context.volunteerUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
        /authorized|admin|permission/i,
      );
      await expect(page.getByTestId('connectshyft-availability-config-form')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-bottom-nav-inbox')).toHaveAttribute(
        'href',
        NO_REFUSAL_QUERY_KEYS,
      );
      await expect(page.getByTestId('connectshyft-bottom-nav-mine')).toHaveAttribute(
        'href',
        NO_REFUSAL_QUERY_KEYS,
      );
      await expect(page.getByTestId('connectshyft-bottom-nav-more')).toHaveAttribute(
        'href',
        NO_REFUSAL_QUERY_KEYS,
      );
    },
  );

  test(
    '[G5-ATDD-E2E-003][P1] authorized admin deep-link to explicit admin settings path resolves with admin nav state and controls @P1',
    async ({ page, storyG5Context }) => {
      await page.goto(buildStoryG5AdminPathUrl(storyG5Context, storyG5Context.paths.moreNumbersUi, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG5Context.orgUnitAdminUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-number-mapping-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-primary-nav-more-active')).toBeVisible();
      await expect(page.getByTestId('connectshyft-admin-settings-context-chip')).toContainText(/admin/i);
    },
  );

  test(
    '[G5-ATDD-E2E-004][P0] role and scope context refresh updates pathway visibility and refuses admin settings access after downgrade @P0',
    async ({ page, storyG5Context }) => {
      await page.goto(buildStoryG5AdminPathUrl(storyG5Context, storyG5Context.paths.moreEscalationUi, {
        role: 'ORGUNIT_ADMIN',
        userId: storyG5Context.orgUnitAdminUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }));
      await expect(page.getByTestId('connectshyft-escalation-settings-surface')).toBeVisible();

      await page.goto(buildStoryG5AdminPathUrl(storyG5Context, storyG5Context.paths.moreEscalationUi, {
        role: 'TENANT_VIEWER',
        userId: storyG5Context.tenantViewerUserId,
        orgUnitMemberships: [],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await expect(page.getByTestId('connectshyft-escalation-settings-form')).toHaveCount(0);
    },
  );

  for (const viewport of VIEWPORT_SCENARIOS) {
    test(
      `[${viewport.id}][P1] volunteer-first More/Settings IA remains clear and stable on ${viewport.label} breakpoint @P1`,
      async ({ page, storyG5Context }) => {
        const breakpoint = storyG5Context.breakpoints[viewport.breakpoint];
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto(buildStoryG5MoreUrl(storyG5Context, {
          role: 'ORGUNIT_MEMBER',
          userId: storyG5Context.volunteerUserId,
          orgUnitMemberships: [storyG5Context.orgUnitId],
        }));

        await expect(page.getByTestId(viewport.layoutTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-option-directory')).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-option-sign-out')).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-admin-option-availability')).toHaveCount(0);
      },
    );
  }

  test(
    '[G5-ATDD-E2E-006][P1] volunteer More/Settings supports keyboard traversal and screen-reader labels for primary actions @P1',
    async ({ page, storyG5Context }) => {
      await page.goto(buildStoryG5MoreUrl(storyG5Context, {
        role: 'ORGUNIT_MEMBER',
        userId: storyG5Context.volunteerUserId,
        orgUnitMemberships: [storyG5Context.orgUnitId],
      }));

      const directory = page.getByTestId('connectshyft-more-option-directory');
      const settings = page.getByTestId('connectshyft-more-option-settings');
      const signOut = page.getByTestId('connectshyft-more-option-sign-out');

      await directory.focus();
      await expect(directory).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(settings).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(signOut).toBeFocused();

      await expect(page.getByTestId('connectshyft-bottom-nav-inbox')).toHaveAttribute('aria-label', 'Open Inbox');
      await expect(page.getByTestId('connectshyft-bottom-nav-mine')).toHaveAttribute('aria-label', 'Open Mine');
      await expect(page.getByTestId('connectshyft-bottom-nav-more')).toHaveAttribute('aria-label', 'Open More');
      await expect(page.getByRole('link', { name: /directory/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /connectshyft settings/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    },
  );
});
