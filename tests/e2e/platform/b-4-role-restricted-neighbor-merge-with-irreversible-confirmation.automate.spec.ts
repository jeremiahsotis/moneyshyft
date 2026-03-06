import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import { ensureConnectShyftDbHousehold } from '../../support/helpers/connectShyftDbActor';
import {
  createStoryB4Context,
  createStoryB4Headers,
  type StoryB4Context,
} from '../../support/factories/connectShyftStoryB4Factory';

const buildNeighborProfileUrl = (
  context: StoryB4Context,
  seeded: { sourceNeighborId: string; survivorNeighborId: string },
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
    activeThreadNeighborIds: seeded.survivorNeighborId,
    actorUserId: options.actorUserId,
    mergeCandidateNeighborId: seeded.sourceNeighborId,
  });

  return `/app/connectshyft/neighbors/${seeded.survivorNeighborId}?${params.toString()}`;
};

const seedNeighbor = async (
  request: Parameters<typeof apiRequest>[0],
  path: string,
  headers: Record<string, string>,
  firstName: string,
  lastName: string,
): Promise<string> => {
  const response = await apiRequest(request, {
    method: 'POST',
    path,
    headers,
    data: {
      firstName,
      lastName,
      phones: [
        {
          label: 'mobile',
          value: '+12605550199',
          isShared: true,
          verificationStatus: 'verified',
        },
      ],
    },
  });

  expect([200, 201]).toContain(response.status());
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
  });
  const neighborId = body?.data?.neighbor?.neighborId;
  expect(typeof neighborId).toBe('string');
  return neighborId as string;
};

const seedNeighborPair = async (
  request: Parameters<typeof apiRequest>[0],
  context: StoryB4Context,
): Promise<{ sourceNeighborId: string; survivorNeighborId: string }> => {
  await ensureConnectShyftDbHousehold(context.tenantId);
  const seedHeaders = createStoryB4Headers(context, {
    role: 'TENANT_ADMIN',
    userId: context.tenantAdminUserId,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
  });
  const suffix = Date.now().toString(36);
  const sourceNeighborId = await seedNeighbor(
    request,
    context.paths.neighborsCollection,
    seedHeaders,
    `Source-${suffix}`,
    'Neighbor',
  );
  const survivorNeighborId = await seedNeighbor(
    request,
    context.paths.neighborsCollection,
    seedHeaders,
    `Survivor-${suffix}`,
    'Neighbor',
  );

  return {
    sourceNeighborId,
    survivorNeighborId,
  };
};

test.describe(
  'Story b.4 role-restricted neighbor merge with irreversible confirmation (Automate E2E Expansion)',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] merge modal shows irreversible language, before/after impact summary, and blocked submit before valid confirmation @P0',
      async ({ page, request }) => {
        const context = createStoryB4Context();
        const seeded = await seedNeighborPair(request, context);
        await login(page);

        await page.goto(
          buildNeighborProfileUrl(context, seeded, {
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
        ).toContainText(seeded.sourceNeighborId);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-impact-summary'),
        ).toContainText(seeded.survivorNeighborId);
        await expect(
          page.getByTestId('connectshyft-neighbor-merge-confirmation-submit'),
        ).toBeDisabled();
      },
    );

    test(
      '[P1] canceling the irreversible confirmation modal closes merge flow without emitting a merge POST request @P1',
      async ({ page, request }) => {
        const context = createStoryB4Context();
        const seeded = await seedNeighborPair(request, context);
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
          buildNeighborProfileUrl(context, seeded, {
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

    test(
      '[P1] surrounding whitespace and case drift in confirmation phrase remain invalid and prevent request dispatch @P1',
      async ({ page, request }) => {
        const context = createStoryB4Context();
        const seeded = await seedNeighborPair(request, context);
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
          buildNeighborProfileUrl(context, seeded, {
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

    test(
      '[P1] successful merge keeps operator on survivor profile and surfaces before/after audit chips for continuity evidence @P1',
      async ({ page, request }) => {
        const context = createStoryB4Context();
        const seeded = await seedNeighborPair(request, context);
        await login(page);

        await page.goto(
          buildNeighborProfileUrl(context, seeded, {
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

        await expect(page).toHaveURL(new RegExp(seeded.survivorNeighborId));
        await expect(page.getByTestId('connectshyft-neighbor-merge-success')).toContainText(
          'Neighbor merge complete',
        );
        await expect(page.getByTestId('connectshyft-neighbor-merge-audit-before-id')).toContainText(
          seeded.sourceNeighborId,
        );
        await expect(page.getByTestId('connectshyft-neighbor-merge-audit-after-id')).toContainText(
          seeded.survivorNeighborId,
        );
      },
    );

    test(
      '[P2] orgUnit member without scoped membership sees deterministic refusal guidance and no actionable merge control @P2',
      async ({ page, request }) => {
        const context = createStoryB4Context();
        const seeded = await seedNeighborPair(request, context);
        await login(page);

        await page.goto(
          buildNeighborProfileUrl(context, seeded, {
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
