import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createStoryB4Context, type StoryB4Context } from '../../support/factories/connectShyftStoryB4Factory';

const buildNeighborProfileUrl = (
  context: StoryB4Context,
  options: {
    tenantId: string;
    orgUnitId: string;
    tenantRole: string;
    orgUnitMemberships: string[];
    actorUserId: string;
  },
): string => {
  const params = new URLSearchParams({
    flags: 'module:on,inbox:on,escalation:on,webhooks:on',
    tenantId: options.tenantId,
    orgUnitId: options.orgUnitId,
    tenantRole: options.tenantRole,
    orgUnitMemberships: options.orgUnitMemberships.join(','),
    actorUserId: options.actorUserId,
    mergeCandidateNeighborId: context.sourceNeighborId,
  });

  return `${context.paths.neighborProfileUi}?${params.toString()}`;
};

test.describe(
  'Story b.4 Role-Restricted Neighbor Merge with Irreversible Confirmation (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] authorized identity lead must confirm irreversible merge intent and sees before/after audit summary on success @P0',
      async ({ page }) => {
        const context = createStoryB4Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_IDENTITY_LEAD',
            orgUnitMemberships: [context.primaryOrgUnitId],
            actorUserId: context.identityLeadUserId,
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(page.getByTestId('connectshyft-neighbor-merge-action')).toBeVisible();

        await page.getByTestId('connectshyft-neighbor-merge-action').click();

        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-modal'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-impact-summary'),
        ).toContainText(context.sourceNeighborId);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-impact-summary'),
        ).toContainText(context.survivorNeighborId);

        await page.getByTestId('connectshyft-neighbor-merge-confirmation-input').fill(
          context.irreversibleConfirmationPhrase,
        );

        const mergeResponse = page.waitForResponse(
          (response) =>
            response.url().includes(context.paths.neighborMerge)
            && response.request().method() === 'POST',
        );
        await page.getByTestId('connectshyft-neighbor-merge-confirmation-submit').click();
        await mergeResponse;

        await expect(page.getByTestId('connectshyft-neighbor-merge-success')).toContainText(
          'Neighbor merge complete',
        );
        await expect(page.getByTestId('connectshyft-neighbor-merge-audit-before-id')).toContainText(
          context.sourceNeighborId,
        );
        await expect(page.getByTestId('connectshyft-neighbor-merge-audit-after-id')).toContainText(
          context.survivorNeighborId,
        );
      },
    );

    test.skip(
      '[P1] ORGUNIT_MEMBER receives deterministic refusal guidance and merge controls remain blocked @P1',
      async ({ page }) => {
        const context = createStoryB4Context();
        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [context.primaryOrgUnitId],
            actorUserId: context.orgUnitMemberUserId,
          }),
        );

        await expect(
          page.getByTestId('connectshyft-neighbor-merge-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-refusal-code'),
        ).toHaveText(context.refusalCodes.mergeForbidden);
        await expect(page.getByTestId('connectshyft-neighbor-merge-action')).toBeDisabled();
      },
    );

    test.skip(
      '[P1] tenant admin must type irreversible phrase exactly before merge request can be submitted @P1',
      async ({ page }) => {
        const context = createStoryB4Context();
        let mergeRequestCount = 0;
        page.on('request', (request) => {
          if (
            request.url().includes(context.paths.neighborMerge)
            && request.method() === 'POST'
          ) {
            mergeRequestCount += 1;
          }
        });

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'TENANT_ADMIN',
            orgUnitMemberships: [context.primaryOrgUnitId],
            actorUserId: context.tenantAdminUserId,
          }),
        );

        await page.getByTestId('connectshyft-neighbor-merge-action').click();
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-modal'),
        ).toBeVisible();

        await page.getByTestId('connectshyft-neighbor-merge-confirmation-input').fill(
          `${context.irreversibleConfirmationPhrase}-WRONG`,
        );

        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-error'),
        ).toContainText('Type the irreversible confirmation phrase exactly');
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-submit'),
        ).toBeDisabled();
        await expect.poll(() => mergeRequestCount).toBe(0);
      },
    );
  },
);
