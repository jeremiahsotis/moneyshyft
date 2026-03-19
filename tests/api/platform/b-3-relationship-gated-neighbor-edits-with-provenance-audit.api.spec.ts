import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryB3Headers,
  type StoryB3Context,
} from '../../support/factories/connectShyftStoryB3Factory';
import { createUniqueConnectShyftTestPhone } from '../../support/factories/connectShyftTestPhoneFactory';
import { test, expect } from '../../support/fixtures/connectShyftStoryB3.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

type SeedNeighborResult = {
  neighborId: string;
};

const seedNeighbor = async (
  request: Parameters<typeof apiRequest>[0],
  context: StoryB3Context,
): Promise<SeedNeighborResult> => {
  const sharedPhone = createUniqueConnectShyftTestPhone('4');
  const nonSharedPhone = createUniqueConnectShyftTestPhone('5');

  const createHeaders = createStoryB3Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: `user-connectshyft-b3-seed-${Date.now()}`,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
  });

  const createResponse = await apiRequest(request, {
    method: 'POST',
    path: context.paths.neighborsCollection,
    headers: createHeaders,
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
    data: {
      neighbor: {
        tenantId: context.tenantId,
        orgUnitId: context.primaryOrgUnitId,
      },
    },
  });

  const neighborId = createBody?.data?.neighbor?.neighborId;
  expect(typeof neighborId).toBe('string');

  return { neighborId: neighborId as string };
};

const relatedActorHeadersForNeighbor = (
  context: StoryB3Context,
  neighborId: string,
): Record<string, string> =>
  createStoryB3Headers(context, {
    role: 'ORGUNIT_IDENTITY_LEAD',
    userId: context.relatedActorUserId,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
    activeThreadNeighborIds: [neighborId],
  });

const tenantPrivilegedHeadersForNeighbor = (
  context: StoryB3Context,
): Record<string, string> =>
  createStoryB3Headers(context, {
    role: 'TENANT_STAFF',
    userId: context.tenantPrivilegedUserId,
    orgUnitId: context.peerOrgUnitId,
    orgUnitMemberships: [],
  });

const unrelatedActorHeadersForNeighbor = (
  context: StoryB3Context,
): Record<string, string> =>
  createStoryB3Headers(context, {
    role: 'ORGUNIT_IDENTITY_LEAD',
    userId: context.unrelatedActorUserId,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
    activeThreadNeighborIds: [],
  });

const orgUnitMemberHeadersForNeighbor = (
  context: StoryB3Context,
): Record<string, string> =>
  createStoryB3Headers(context, {
    role: 'ORGUNIT_MEMBER',
    userId: `user-connectshyft-b3-member-${Date.now()}`,
    orgUnitId: context.primaryOrgUnitId,
    orgUnitMemberships: [context.primaryOrgUnitId],
    activeThreadNeighborIds: [],
  });

test.describe(
  'Story b.3 automate - relationship-gated neighbor edits API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] permits related identity leads to edit neighbors and emits org_unit_id provenance in audit and outbox metadata @P0',
      async ({
        request,
        storyB3Context,
        storyB3RelatedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: relatedActorHeadersForNeighbor(storyB3Context, seeded.neighborId),
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            scope: {
              tenantId: storyB3Context.tenantId,
              orgUnitId: storyB3Context.primaryOrgUnitId,
            },
            neighbor: {
              neighborId: seeded.neighborId,
              tenantId: storyB3Context.tenantId,
              firstName: storyB3Context.relatedUpdateFirstName,
              lastName: storyB3Context.relatedUpdateLastName,
            },
            audit: {
              eventName: 'connectshyft.neighbor.updated',
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                actor_user_id: storyB3Context.relatedActorUserId,
                mutation_context: expect.objectContaining({
                  policy_path: 'relationship-gated',
                  neighbor_id: seeded.neighborId,
                }),
              }),
            },
            outbox: {
              eventName: 'connectshyft.neighbor.updated',
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                actor_user_id: storyB3Context.relatedActorUserId,
              }),
            },
          },
        });
      },
    );

    test(
      '[P0] permits tenant-privileged roles to bypass relationship checks and still records provenance metadata @P0',
      async ({
        request,
        storyB3Context,
        storyB3TenantPrivilegedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: tenantPrivilegedHeadersForNeighbor(storyB3Context),
          data: storyB3TenantPrivilegedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            scope: {
              tenantId: storyB3Context.tenantId,
              orgUnitId: storyB3Context.peerOrgUnitId,
            },
            neighbor: {
              neighborId: seeded.neighborId,
              firstName: storyB3Context.tenantPrivilegedUpdateFirstName,
              lastName: storyB3Context.tenantPrivilegedUpdateLastName,
            },
            audit: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.peerOrgUnitId,
                actor_user_id: storyB3Context.tenantPrivilegedUserId,
                policy_path: 'tenant-privileged',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.peerOrgUnitId,
                actor_user_id: storyB3Context.tenantPrivilegedUserId,
              }),
            },
          },
        });
      },
    );

    test(
      '[P0] refuses unrelated callers with deterministic policy messaging and no neighbor or provenance leakage @P0',
      async ({
        request,
        storyB3Context,
        storyB3RelatedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: unrelatedActorHeadersForNeighbor(storyB3Context),
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: expect.stringContaining('active thread relationship'),
        });
        expect(body).not.toHaveProperty('data.neighbor');
        expect(body).not.toHaveProperty('data.audit');
        expect(body).not.toHaveProperty('data.outbox');
      },
    );

    test(
      '[P1] keeps refusal code and policy message stable across repeated unauthorized edit attempts @P1',
      async ({
        request,
        storyB3Context,
        storyB3RelatedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const firstResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: unrelatedActorHeadersForNeighbor(storyB3Context),
          data: storyB3RelatedUpdatePayload,
        });
        const secondResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: unrelatedActorHeadersForNeighbor(storyB3Context),
          data: storyB3RelatedUpdatePayload,
        });

        expect(firstResponse.status()).toBe(200);
        expect(secondResponse.status()).toBe(200);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: expect.any(String),
        });
        expect(secondBody).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: firstBody.message,
        });
        expect(firstBody).not.toHaveProperty('data.neighbor');
        expect(firstBody).not.toHaveProperty('data.audit');
        expect(firstBody).not.toHaveProperty('data.outbox');
        expect(secondBody).not.toHaveProperty('data.neighbor');
        expect(secondBody).not.toHaveProperty('data.audit');
        expect(secondBody).not.toHaveProperty('data.outbox');
      },
    );

    test(
      '[P1] preserves canonical envelope keys across relationship-allow and refusal edit paths @P1',
      async ({
        request,
        storyB3Context,
        storyB3RelatedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const successResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: relatedActorHeadersForNeighbor(storyB3Context, seeded.neighborId),
          data: storyB3RelatedUpdatePayload,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: unrelatedActorHeadersForNeighbor(storyB3Context),
          data: storyB3RelatedUpdatePayload,
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(successBody, key),
          ),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) =>
            Object.prototype.hasOwnProperty.call(refusalBody, key),
          ),
        ).toBe(true);
      },
    );

    test(
      '[P1] refuses orgUnit members without active thread relationship even when route capability checks pass @P1',
      async ({
        request,
        storyB3Context,
        storyB3RelatedUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: orgUnitMemberHeadersForNeighbor(storyB3Context),
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: storyB3Context.refusalCodes.relationshipRequired,
          refusalType: 'business',
          message: expect.stringContaining('active thread relationship'),
        });
      },
    );

    test(
      '[P1] returns deterministic side-effect persistence indicators for relationship-gated edits @P1',
      async ({ request, storyB3Context, storyB3RelatedUpdatePayload }) => {
        const seeded = await seedNeighbor(request, storyB3Context);
        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: relatedActorHeadersForNeighbor(storyB3Context, seeded.neighborId),
          data: storyB3RelatedUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            sideEffectsPersisted: expect.any(Boolean),
            audit: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                policy_path: 'relationship-gated',
              }),
            },
            outbox: {
              metadata: expect.objectContaining({
                org_unit_id: storyB3Context.primaryOrgUnitId,
                policy_path: 'relationship-gated',
              }),
            },
          },
        });
      },
    );
  },
);
