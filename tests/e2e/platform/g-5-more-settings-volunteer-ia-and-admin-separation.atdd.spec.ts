import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG5AdminPathUrl,
  buildStoryG5MoreUrl,
  createStoryG5Context,
} from '../../support/factories/connectShyftStoryG5Factory';

const context = createStoryG5Context();

test.describe('Story g.5 More/Settings Volunteer IA and Admin Separation (ATDD E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test(
    '[G5-ATDD-E2E-001][P0] volunteer More/Settings shows volunteer-first IA options and excludes admin controls @P0',
    async ({ page }) => {
      await page.goto(buildStoryG5MoreUrl(context, {
        role: 'ORGUNIT_MEMBER',
        userId: context.volunteerUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-more-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-directory')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-settings')).toBeVisible();
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
    async ({ page }) => {
      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreAvailabilityUi, {
        role: 'ORGUNIT_MEMBER',
        userId: context.volunteerUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
        /authorized|admin|permission/i,
      );
      await expect(page.getByTestId('connectshyft-availability-config-form')).toHaveCount(0);
    },
  );

  test(
    '[G5-ATDD-E2E-003][P1] authorized admin deep-link to explicit admin settings path resolves with admin nav state and controls @P1',
    async ({ page }) => {
      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreNumbersUi, {
        role: 'ORGUNIT_ADMIN',
        userId: context.orgUnitAdminUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-number-mapping-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-primary-nav-more-active')).toBeVisible();
      await expect(page.getByTestId('connectshyft-admin-settings-context-chip')).toContainText(/admin/i);
    },
  );

  test(
    '[G5-ATDD-E2E-004][P0] role and scope context refresh updates pathway visibility and refuses admin settings access after downgrade @P0',
    async ({ page }) => {
      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreEscalationUi, {
        role: 'ORGUNIT_ADMIN',
        userId: context.orgUnitAdminUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));
      await expect(page.getByTestId('connectshyft-escalation-settings-surface')).toBeVisible();

      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreEscalationUi, {
        role: 'TENANT_VIEWER',
        userId: context.tenantViewerUserId,
        orgUnitMemberships: [],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await expect(page.getByTestId('connectshyft-escalation-settings-form')).toHaveCount(0);
    },
  );

  test(
    '[G5-ATDD-E2E-005][P1] volunteer-first More/Settings IA remains clear and stable across mobile tablet and desktop breakpoints @P1',
    async ({ page }) => {
      const viewportMatrix = [
        {
          label: 'mobile',
          width: context.breakpoints.mobile.width,
          height: context.breakpoints.mobile.height,
          layoutTestId: 'connectshyft-more-layout-mobile',
        },
        {
          label: 'tablet',
          width: context.breakpoints.tablet.width,
          height: context.breakpoints.tablet.height,
          layoutTestId: 'connectshyft-more-layout-tablet',
        },
        {
          label: 'desktop',
          width: context.breakpoints.desktop.width,
          height: context.breakpoints.desktop.height,
          layoutTestId: 'connectshyft-more-layout-desktop',
        },
      ];

      for (const viewport of viewportMatrix) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(buildStoryG5MoreUrl(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.volunteerUserId,
          orgUnitMemberships: [context.orgUnitId],
        }));

        await expect(page.getByTestId(viewport.layoutTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-option-directory')).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-option-sign-out')).toBeVisible();
        await expect(page.getByTestId('connectshyft-more-admin-option-availability')).toHaveCount(0);
      }
    },
  );
});
