import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryB2Context,
  createStoryB2Headers,
  type StoryB2Context,
} from '../../support/factories/connectShyftStoryB2Factory';

const buildNeighborProfileUrl = (
  context: StoryB2Context,
  neighborId: string,
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

  return `/app/connectshyft/neighbors/${neighborId}?${params.toString()}`;
};

const seedNeighbor = async (
  request: APIRequestContext,
  context: StoryB2Context,
): Promise<{ neighborId: string }> => {
  const headers = createStoryB2Headers(context, {
    role: 'ORGUNIT_MEMBER',
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
  });

  const createResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.neighborsCollection,
    headers,
    data: {
      orgUnitId: context.primaryOrgUnitId,
      firstName: context.baseFirstName,
      lastName: context.baseLastName,
      phones: [
        {
          label: 'mobile',
          value: context.sharedPhoneRaw,
          isShared: true,
          verificationStatus: 'verified',
        },
        {
          label: 'home',
          value: context.nonSharedPhoneRaw,
          isShared: false,
          verificationStatus: 'unverified',
        },
      ],
    },
  });

  expect(createResponse.status()).toBe(201);
  const createBody = await createResponse.json();
  expect(createBody).toMatchObject({
    ok: true,
    code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
  });

  const neighborId = createBody?.data?.neighbor?.neighborId;
  expect(typeof neighborId).toBe('string');
  return { neighborId: neighborId as string };
};

test.describe(
  'Story b.2 automate - shared tenant identity and shared-phone indicator operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] operator updates tenant-shared profile data and sees explicit tenant-wide impact guidance before save @P0',
      async ({ page, request }) => {
        const context = createStoryB2Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
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
            response.url().includes(`/api/v1/connectshyft/neighbors/${seeded.neighborId}`)
            && response.request().method() === 'PUT',
        );
        await page.getByRole('button', { name: 'Save Neighbor Profile' }).click();
        await updateResponse;

        await expect(page.getByTestId('connectshyft-neighbor-profile-save-success')).toContainText(
          'Neighbor profile updated',
        );
      },
    );

    test(
      '[P0] authorized operators in another orgUnit immediately see shared identity and phone indicator updates @P0',
      async ({ page, request }) => {
        const context = createStoryB2Context();
        const seeded = await seedNeighbor(request, context);

        const updateHeaders = createStoryB2Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitId: context.primaryOrgUnitId,
          orgUnitMemberships: [context.primaryOrgUnitId],
        });

        const updateResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: updateHeaders,
          data: {
            orgUnitId: context.primaryOrgUnitId,
            firstName: context.updatedFirstName,
            lastName: context.updatedLastName,
            phones: [
              {
                label: 'mobile',
                value: context.sharedPhoneRaw,
                isShared: true,
                verificationStatus: 'verified',
              },
              {
                label: 'home',
                value: context.nonSharedPhoneRaw,
                isShared: false,
                verificationStatus: 'unverified',
              },
            ],
          },
        });
        expect(updateResponse.status()).toBe(200);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
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

    test(
      '[P1] cross-tenant deep links render refusal state and keep neighbor profile fields hidden @P1',
      async ({ page, request }) => {
        const context = createStoryB2Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
            tenantId: context.crossTenantId,
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
        ).toHaveText('CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH');
        await expect(page.getByTestId('connectshyft-neighbor-profile-form')).toBeHidden();
      },
    );

    test(
      '[P1] tenant-privileged role-admin UI path can load shared neighbor profile without explicit orgUnit membership @P1',
      async ({ page, request }) => {
        const context = createStoryB2Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
            tenantId: context.tenantId,
            orgUnitId: context.peerOrgUnitId,
            tenantRole: 'TENANT_STAFF',
            orgUnitMemberships: [],
          }),
        );

        await expect(page.getByRole('heading', { name: 'Neighbor Profile' })).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-neighbor-profile-refusal-state'),
        ).toHaveCount(0);
        await expect(
          page.getByTestId('connectshyft-neighbor-first-name-input'),
        ).toBeVisible();
      },
    );
  },
);
