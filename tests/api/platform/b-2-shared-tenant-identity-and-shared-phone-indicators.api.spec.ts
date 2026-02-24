import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryB2.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

type SeedNeighborResult = {
  neighborId: string;
};

const seedNeighbor = async (
  request: Parameters<typeof apiRequest>[0],
  context: {
    paths: { neighborsCollection: string };
    baseFirstName: string;
    baseLastName: string;
    sharedPhoneRaw: string;
    nonSharedPhoneRaw: string;
    tenantId: string;
    primaryOrgUnitId: string;
  },
  headers: Record<string, string>,
): Promise<SeedNeighborResult> => {
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
    data: {
      neighbor: {
        tenantId: context.tenantId,
        orgUnitId: context.primaryOrgUnitId,
      },
    },
  });

  const neighborId = createBody?.data?.neighbor?.neighborId;
  expect(typeof neighborId).toBe('string');

  return {
    neighborId: neighborId as string,
  };
};

test.describe(
  'Story b.2 automate - shared tenant identity and shared-phone indicator API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] propagates neighbor identity updates across authorized orgUnits in the same tenant immediately @P0',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2PeerOrgUnitHeaders,
        storyB2IdentityUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(
          request,
          storyB2Context,
          storyB2PrimaryHeaders,
        );

        const updateResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2PrimaryHeaders,
          data: storyB2IdentityUpdatePayload,
        });

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            neighbor: {
              neighborId: seeded.neighborId,
              tenantId: storyB2Context.tenantId,
              firstName: storyB2Context.updatedFirstName,
              lastName: storyB2Context.updatedLastName,
            },
          },
        });

        const crossOrgUnitReadResponse = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2PeerOrgUnitHeaders,
        });

        expect(crossOrgUnitReadResponse.status()).toBe(200);
        const crossOrgUnitReadBody = await crossOrgUnitReadResponse.json();
        expect(crossOrgUnitReadBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            scope: {
              tenantId: storyB2Context.tenantId,
              orgUnitId: storyB2Context.peerOrgUnitId,
            },
            neighbor: {
              neighborId: seeded.neighborId,
              tenantId: storyB2Context.tenantId,
              firstName: storyB2Context.updatedFirstName,
              lastName: storyB2Context.updatedLastName,
            },
          },
        });
      },
    );

    test(
      '[P0] persists shared-phone indicator toggles and returns consistent flags in detail and collection contracts @P0',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2PeerOrgUnitHeaders,
        storyB2SharedIndicatorTogglePayload,
      }) => {
        const seeded = await seedNeighbor(
          request,
          storyB2Context,
          storyB2PrimaryHeaders,
        );

        const updateResponse = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2PrimaryHeaders,
          data: storyB2SharedIndicatorTogglePayload,
        });

        expect(updateResponse.status()).toBe(200);
        const updateBody = await updateResponse.json();
        expect(updateBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_UPDATED',
          data: {
            neighbor: {
              phones: [
                expect.objectContaining({
                  label: 'mobile',
                  value: storyB2Context.sharedPhoneNormalized,
                  isShared: false,
                }),
                expect.objectContaining({
                  label: 'home',
                  value: storyB2Context.nonSharedPhoneNormalized,
                  isShared: true,
                }),
              ],
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2PeerOrgUnitHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            neighbor: {
              phones: [
                expect.objectContaining({ label: 'mobile', isShared: false }),
                expect.objectContaining({ label: 'home', isShared: true }),
              ],
            },
          },
        });

        const collectionResponse = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborsCollection,
          headers: storyB2PeerOrgUnitHeaders,
        });

        expect(collectionResponse.status()).toBe(200);
        const collectionBody = await collectionResponse.json();
        expect(collectionBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBORS_RESOLVED',
          data: {
            neighbors: expect.arrayContaining([
              expect.objectContaining({
                neighborId: seeded.neighborId,
                phones: [
                  expect.objectContaining({ label: 'mobile', isShared: false }),
                  expect.objectContaining({ label: 'home', isShared: true }),
                ],
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P0] refuses cross-tenant profile reads with deterministic refusal semantics and zero identity leakage @P0',
      async ({ request, storyB2Context, storyB2PrimaryHeaders, storyB2CrossTenantHeaders }) => {
        const seeded = await seedNeighbor(
          request,
          storyB2Context,
          storyB2PrimaryHeaders,
        );

        const response = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2CrossTenantHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
          correlationId: expect.any(String),
          tenantId: storyB2Context.crossTenantId,
        });
        expect(body).not.toHaveProperty('data.neighbor');
        expect(body).not.toHaveProperty('data.neighbors');
      },
    );

    test(
      '[P1] refuses cross-tenant identity updates without leaking persisted phone metadata @P1',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2CrossTenantHeaders,
        storyB2IdentityUpdatePayload,
      }) => {
        const seeded = await seedNeighbor(
          request,
          storyB2Context,
          storyB2PrimaryHeaders,
        );

        const response = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2CrossTenantHeaders,
          data: storyB2IdentityUpdatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
          message: expect.any(String),
          correlationId: expect.any(String),
          tenantId: storyB2Context.crossTenantId,
        });
        expect(body).not.toHaveProperty('data.neighbor');
        expect(body).not.toHaveProperty('data.phones');
      },
    );

    test(
      '[P1] preserves canonical envelope keys across shared-identity success and refusal paths @P1',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2CrossTenantHeaders,
      }) => {
        const seeded = await seedNeighbor(
          request,
          storyB2Context,
          storyB2PrimaryHeaders,
        );

        const successResponse = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2PrimaryHeaders,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'GET',
          path: `/api/v1/connectshyft/neighbors/${seeded.neighborId}`,
          headers: storyB2CrossTenantHeaders,
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

  },
);
