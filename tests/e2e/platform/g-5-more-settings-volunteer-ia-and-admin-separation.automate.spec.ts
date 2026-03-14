import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  buildStoryG5AdminPathUrl,
  buildStoryG5MoreUrl,
  createStoryG5Context,
} from '../../support/factories/connectShyftStoryG5Factory';

const context = createStoryG5Context();

test.describe('Story g.5 More/Settings Volunteer IA and Admin Separation (Automate E2E Expansion)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test(
    '[G5-AUTO-E2E-301][P0] orgUnit admin without membership is redirected to refusal guidance and never sees admin controls @P0',
    async ({ page }) => {
      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreAvailabilityUi, {
        role: 'ORGUNIT_ADMIN',
        userId: context.orgUnitAdminUserId,
        orgUnitMemberships: [],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
        /authorized admin users only/i,
      );
      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
        context.paths.moreAvailabilityUi,
      );
      await expect(page.getByTestId('connectshyft-availability-config-form')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-more-admin-option-availability')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-more-admin-option-numbers')).toHaveCount(0);
      await expect(page.getByTestId('connectshyft-more-admin-option-escalation')).toHaveCount(0);
    },
  );

  test(
    '[G5-AUTO-E2E-302][P0] authorized admin sees all admin settings cards with explicit destinations from the More surface @P0',
    async ({ page }) => {
      await page.goto(buildStoryG5MoreUrl(context, {
        role: 'ORGUNIT_ADMIN',
        userId: context.orgUnitAdminUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-more-surface')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-directory')).toBeVisible();
      await expect(page.getByTestId('connectshyft-more-option-settings')).toBeVisible();

      const availabilityLink = page.getByTestId('connectshyft-more-admin-option-availability');
      const numbersLink = page.getByTestId('connectshyft-more-admin-option-numbers');
      const escalationLink = page.getByTestId('connectshyft-more-admin-option-escalation');

      await expect(availabilityLink).toBeVisible();
      await expect(numbersLink).toBeVisible();
      await expect(escalationLink).toBeVisible();
      await expect(availabilityLink).toHaveAttribute('href', /\/app\/connectshyft\/settings\/availability/);
      await expect(numbersLink).toHaveAttribute('href', /\/app\/connectshyft\/settings\/numbers/);
      await expect(escalationLink).toHaveAttribute('href', /\/app\/connectshyft\/settings\/escalation/);
    },
  );

  test(
    '[G5-AUTO-E2E-303][P1] admin More cards route to each admin surface while preserving More nav active state and admin context chip @P1',
    async ({ page }) => {
      const adminActor = {
        role: 'ORGUNIT_ADMIN',
        userId: context.orgUnitAdminUserId,
        orgUnitMemberships: [context.orgUnitId],
      };
      const routeMatrix = [
        {
          linkTestId: 'connectshyft-more-admin-option-availability',
          destinationPattern: /\/app\/connectshyft\/settings\/availability/,
          surfaceTestId: 'connectshyft-availability-surface',
        },
        {
          linkTestId: 'connectshyft-more-admin-option-numbers',
          destinationPattern: /\/app\/connectshyft\/settings\/numbers/,
          surfaceTestId: 'connectshyft-number-mapping-surface',
        },
        {
          linkTestId: 'connectshyft-more-admin-option-escalation',
          destinationPattern: /\/app\/connectshyft\/settings\/escalation/,
          surfaceTestId: 'connectshyft-escalation-settings-surface',
        },
      ] as const;

      for (const routeTarget of routeMatrix) {
        await page.goto(buildStoryG5MoreUrl(context, adminActor));
        await page.getByTestId(routeTarget.linkTestId).click();

        await expect(page).toHaveURL(routeTarget.destinationPattern);
        await expect(page.getByTestId(routeTarget.surfaceTestId)).toBeVisible();
        await expect(page.getByTestId('connectshyft-primary-nav-more-active')).toBeVisible();
        await expect(page.getByTestId('connectshyft-admin-settings-context-chip')).toContainText(/admin/i);
      }
    },
  );

  test(
    '[G5-AUTO-E2E-304][P1] refusal query keys are stripped when navigating via bottom nav and refusal banner does not persist @P1',
    async ({ page }) => {
      await page.goto(buildStoryG5AdminPathUrl(context, context.paths.moreNumbersUi, {
        role: 'ORGUNIT_MEMBER',
        userId: context.volunteerUserId,
        orgUnitMemberships: [context.orgUnitId],
      }));

      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
      await page.getByTestId('connectshyft-bottom-nav-more').click();

      await expect(page).toHaveURL(/\/app\/connectshyft\/more|\/app\/connectshyft\/settings/);
      await expect(page).not.toHaveURL(/settingsRefusal|settingsRefusedPath/);
      await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toHaveCount(0);
    },
  );
});
