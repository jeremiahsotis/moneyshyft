import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryB3Context,
  createStoryB3Headers,
  type StoryB3Context,
} from '../../support/factories/connectShyftStoryB3Factory';
import { createUniqueConnectShyftTestPhone } from '../../support/factories/connectShyftTestPhoneFactory';

const buildNeighborProfileUrl = (
  context: StoryB3Context,
  neighborId: string,
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

  return `/app/connectshyft/neighbors/${neighborId}?${params.toString()}`;
};

const seedNeighbor = async (
  request: APIRequestContext,
  context: StoryB3Context,
): Promise<{ neighborId: string }> => {
  const sharedPhone = createUniqueConnectShyftTestPhone('4');
  const nonSharedPhone = createUniqueConnectShyftTestPhone('5');
  const seedHeaders = createStoryB3Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: `user-connectshyft-b3-seed-ui-${Date.now()}`,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const createResponse = await apiRequest(request, {
        method: 'POST',
        path: context.paths.neighborsCollection,
        headers: seedHeaders,
        data: {
          orgUnitId: context.primaryOrgUnitId,
          firstName: context.baseFirstName,
          lastName: context.baseLastName,
          phones: [
            {
              label: 'mobile',
              value: sharedPhone.raw,
              isShared: true,
              verificationStatus: 'verified',
            },
            {
              label: 'home',
              value: nonSharedPhone.raw,
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
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const shouldRetry = attempt < 2 && message.includes('ECONNRESET');
      if (!shouldRetry) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw lastError;
};

test.describe(
  'Story b.3 automate - relationship-gated neighbor edit operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] related identity lead can save neighbor edits and sees provenance metadata surfaced in operator UI @P0',
      async ({ page, request }) => {
        const context = createStoryB3Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
            tenantId: context.tenantId,
            orgUnitId: context.primaryOrgUnitId,
            tenantRole: 'ORGUNIT_IDENTITY_LEAD',
            orgUnitMemberships: [context.primaryOrgUnitId],
            activeThreadNeighborIds: [seeded.neighborId],
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
            response.url().includes(`/api/v1/connectshyft/neighbors/${seeded.neighborId}`)
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

    test(
      '[P1] unrelated identity lead sees deterministic refusal guidance and edit controls remain blocked @P1',
      async ({ page, request }) => {
        const context = createStoryB3Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
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

    test(
      '[P1] tenant-privileged operators can edit without active relationship and receive explicit override notice @P1',
      async ({ page, request }) => {
        const context = createStoryB3Context();
        const seeded = await seedNeighbor(request, context);

        await login(page);
        await page.goto(
          buildNeighborProfileUrl(context, seeded.neighborId, {
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
  },
);
