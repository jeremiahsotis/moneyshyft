import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryB2.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

// Story b.2 API update/read routes are not implemented yet in connectshyft.ts.
// Keep these as automation-ready contracts so they can be enabled with implementation.
test.describe(
  'Story b.2 automate - shared tenant identity and shared-phone indicator API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test.fixme(
      '[P0] propagates neighbor identity updates across authorized orgUnits in the same tenant immediately @P0',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2PeerOrgUnitHeaders,
        storyB2IdentityUpdatePayload,
      }) => {
        const updateResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyB2Context.paths.neighborById,
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
              neighborId: storyB2Context.neighborId,
              tenantId: storyB2Context.tenantId,
              firstName: storyB2Context.updatedFirstName,
              lastName: storyB2Context.updatedLastName,
            },
          },
        });

        const crossOrgUnitReadResponse = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborById,
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
              neighborId: storyB2Context.neighborId,
              tenantId: storyB2Context.tenantId,
              firstName: storyB2Context.updatedFirstName,
              lastName: storyB2Context.updatedLastName,
            },
          },
        });
      },
    );

    test.fixme(
      '[P0] persists shared-phone indicator toggles and returns consistent flags in detail and collection contracts @P0',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2PeerOrgUnitHeaders,
        storyB2SharedIndicatorTogglePayload,
      }) => {
        const updateResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyB2Context.paths.neighborById,
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
              phones: expect.arrayContaining([
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
              ]),
            },
          },
        });

        const detailResponse = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborById,
          headers: storyB2PeerOrgUnitHeaders,
        });

        expect(detailResponse.status()).toBe(200);
        const detailBody = await detailResponse.json();
        expect(detailBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_RESOLVED',
          data: {
            neighbor: {
              phones: expect.arrayContaining([
                expect.objectContaining({ label: 'mobile', isShared: false }),
                expect.objectContaining({ label: 'home', isShared: true }),
              ]),
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
                neighborId: storyB2Context.neighborId,
                phones: expect.arrayContaining([
                  expect.objectContaining({ label: 'mobile', isShared: false }),
                  expect.objectContaining({ label: 'home', isShared: true }),
                ]),
              }),
            ]),
          },
        });
      },
    );

    test.fixme(
      '[P0] refuses cross-tenant profile reads with deterministic refusal semantics and zero identity leakage @P0',
      async ({ request, storyB2Context, storyB2CrossTenantHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborById,
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

    test.fixme(
      '[P1] refuses cross-tenant identity updates without leaking persisted phone metadata @P1',
      async ({
        request,
        storyB2Context,
        storyB2CrossTenantHeaders,
        storyB2IdentityUpdatePayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyB2Context.paths.neighborById,
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

    test.fixme(
      '[P1] preserves canonical envelope keys across shared-identity success and refusal paths @P1',
      async ({
        request,
        storyB2Context,
        storyB2PrimaryHeaders,
        storyB2CrossTenantHeaders,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborById,
          headers: storyB2PrimaryHeaders,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'GET',
          path: storyB2Context.paths.neighborById,
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
