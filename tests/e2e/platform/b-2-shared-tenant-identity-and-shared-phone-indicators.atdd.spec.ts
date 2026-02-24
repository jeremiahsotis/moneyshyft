import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createStoryB2Context, type StoryB2Context } from '../../support/factories/connectShyftStoryB2Factory';

const buildNeighborProfileUrl = (
  context: StoryB2Context,
  options: {
    tenantId: string;
    orgUnitId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: options.tenantId,
    orgUnitId: options.orgUnitId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
  });

  return `${context.paths.neighborProfileUi}?${params.toString()}`;
};

test.describe(
  'Story b.2 Shared Tenant Identity and Shared-Phone Indicators (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] operator updates tenant-shared profile data and sees explicit tenant-wide impact guidance before save @P0',
      async ({ page }) => {
        const context = createStoryB2Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.primaryOrgUnitId],
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(
          page.getByText('Changes here affect all orgUnits in this tenant immediately.'),
        ).toBeVisible();

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill(
          context.updatedFirstName,
        );
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill(
          context.updatedLastName,
        );
        await page.getByTestId('connectshyft-neighbor-phone-shared-toggle-mobile').click();

        const updateResponse = page.waitForResponse(
          (response) =>
            response.url().includes(context.paths.neighborById)
            && response.request().method() === 'PUT',
        );

        await page.getByRole('button', { name: 'Save Neighbor Profile' }).click();
        await updateResponse;

        await expect(page.getByTestId('connectshyft-neighbor-profile-save-success')).toContainText(
          'Neighbor profile updated',
        );
        await expect(
          page.getByTestId('connectshyft-neighbor-phone-shared-indicator-mobile'),
        ).toContainText('Shared');
      },
    );

    test.skip(
      '[P0] authorized operators in another orgUnit immediately see shared identity and phone indicator updates @P0',
      async ({ page }) => {
        const context = createStoryB2Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.peerOrgUnitId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.peerOrgUnitId],
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(page.getByTestId('connectshyft-neighbor-first-name-input')).toHaveValue(
          context.updatedFirstName,
        );
        await expect(page.getByTestId('connectshyft-neighbor-last-name-input')).toHaveValue(
          context.updatedLastName,
        );
        await expect(
          page.getByTestId('connectshyft-neighbor-phone-shared-indicator-mobile'),
        ).toContainText('Shared');
      },
    );

    test.skip(
      '[P1] cross-tenant deep links render refusal state and keep neighbor profile fields hidden @P1',
      async ({ page }) => {
        const context = createStoryB2Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.crossTenantOrgUnitId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.crossTenantOrgUnitId],
          }),
        );

        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-code'),
        ).toHaveText('CONNECTSHYFT_NEIGHBOR_NOT_FOUND');
        await expect(page.getByTestId('connectshyft-neighbor-profile-form')).toBeHidden();
      },
    );
  },
);
