import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import {
  createStoryB4Context,
  type StoryB4Context,
} from '../../support/factories/connectShyftStoryB4Factory';

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
  'Story b.4 role-restricted neighbor merge with irreversible confirmation (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] merge modal shows irreversible language, before/after impact summary, and blocked submit before valid confirmation @P0',
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

        await page.getByTestId('connectshyft-neighbor-merge-action').click();
        const modal = page.getByTestId('connectshyft-neighbor-merge-confirmation-modal');

        await expect(modal).toBeVisible();
        await expect(modal).toContainText(/irreversible/i);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-impact-summary'),
        ).toContainText(context.sourceNeighborId);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-impact-summary'),
        ).toContainText(context.survivorNeighborId);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-submit'),
        ).toBeDisabled();
      },
    );

    test.fixme(
      '[P1] canceling the irreversible confirmation modal closes merge flow without emitting a merge POST request @P1',
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

        await page.getByRole('button', { name: /cancel/i }).click();

        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-modal'),
        ).toHaveCount(0);
        await expect.poll(() => mergeRequestCount).toBe(0);
      },
    );

    test.fixme(
      '[P1] surrounding whitespace and case drift in confirmation phrase remain invalid and prevent request dispatch @P1',
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
        await page.getByTestId('connectshyft-neighbor-merge-confirmation-input').fill(
          ` ${context.irreversibleConfirmationPhrase.toLowerCase()} `,
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

    test.fixme(
      '[P1] successful merge keeps operator on survivor profile and surfaces before/after audit chips for continuity evidence @P1',
      async ({ page }) => {
        const context = createStoryB4Context();
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

        await expect(page).toHaveURL(new RegExp(context.survivorNeighborId));
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

    test.fixme(
      '[P2] orgUnit member without scoped membership sees deterministic refusal guidance and no actionable merge control @P2',
      async ({ page }) => {
        const context = createStoryB4Context();
        await login(page);

        await page.goto(
          buildNeighborProfileUrl(context, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_MEMBER',
            orgUnitMemberships: [],
            actorUserId: context.orgUnitMemberUserId,
          }),
        );

        await expect(
          page.getByTestId('connectshyft-neighbor-merge-refusal-state'),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-refusal-code'),
        ).toHaveText(context.refusalCodes.mergeForbidden);
        await expect(page.getByTestId('connectshyft-neighbor-merge-action')).toHaveCount(0);
      },
    );
  },
);
