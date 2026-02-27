import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createStoryB3Context, type StoryB3Context } from '../../support/factories/connectShyftStoryB3Factory';

const buildNeighborProfileUrl = (
  context: StoryB3Context,
  options: {
    tenantId: string;
    orgUnitId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    activeThreadNeighborIds: string[];
    actorUserId: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: options.tenantId,
    orgUnitId: options.orgUnitId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    activeThreadNeighborIds: options.activeThreadNeighborIds.join(','),
    actorUserId: options.actorUserId,
  });

  return `${context.paths.neighborProfileUi}?${params.toString()}`;
};

test.describe(
  'Story b.3 Relationship-Gated Neighbor Edits with Provenance Audit (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] related identity lead can save neighbor edits and sees provenance metadata surfaced in operator UI @P0',
      async ({ page }) => {
        const context = createStoryB3Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_IDENTITY_LEAD',
            orgUnitMemberships: [context.primaryOrgUnitId],
            activeThreadNeighborIds: [context.neighborId],
            actorUserId: context.relatedActorUserId,
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-edit-policy-indicator'),
        ).toContainText('Active thread relationship');

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill(
          context.relatedUpdateFirstName,
        );
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill(
          context.relatedUpdateLastName,
        );

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
        await expect(page.getByTestId('connectshyft-neighbor-provenance-orgunit')).toContainText(
          context.primaryOrgUnitId,
        );
        await expect(page.getByTestId('connectshyft-neighbor-provenance-actor')).toContainText(
          context.relatedActorUserId,
        );
      },
    );

    test.skip(
      '[P1] unrelated identity lead sees deterministic refusal guidance and edit controls remain blocked @P1',
      async ({ page }) => {
        const context = createStoryB3Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_IDENTITY_LEAD',
            orgUnitMemberships: [context.primaryOrgUnitId],
            activeThreadNeighborIds: [],
            actorUserId: context.unrelatedActorUserId,
          }),
        );

        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-code'),
        ).toHaveText(context.refusalCodes.relationshipRequired);
        await expect(
          page.getByText('This edit requires an active thread relationship or tenant-privileged role.'),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save Neighbor Profile' })).toBeDisabled();
      },
    );

    test.skip(
      '[P1] tenant-privileged operators can edit without active relationship and receive explicit override notice @P1',
      async ({ page }) => {
        const context = createStoryB3Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.peerOrgUnitId,
            tenantRole: 'TENANT_STAFF',
            orgUnitMemberships: [],
            activeThreadNeighborIds: [],
            actorUserId: context.tenantPrivilegedUserId,
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-context-override-notice'),
        ).toContainText('Tenant-privileged override applied');
        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-state'),
        ).toHaveCount(0);

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill(
          context.tenantPrivilegedUpdateFirstName,
        );
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill(
          context.tenantPrivilegedUpdateLastName,
        );

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
      },
    );
  },
);
