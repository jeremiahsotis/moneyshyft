import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryB1.fixture';

test.describe(
  'Story b.1 automate - tenant-scoped neighbor creation API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] creates tenant-scoped neighbor records and returns normalized phone values in success envelope @P0',
      async ({ request, storyB1Context, storyB1AuthorizedHeaders, storyB1ValidPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1ValidPayload,
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NEIGHBOR_CREATED',
          data: {
            neighbor: {
              tenantId: storyB1Context.tenantId,
              orgUnitId: storyB1Context.orgUnitId,
              phones: expect.arrayContaining([
                expect.objectContaining({
                  label: 'mobile',
                  value: storyB1Context.validPhoneNormalized,
                }),
              ]),
            },
          },
        });
      },
    );

    test(
      '[P0] refuses create requests that omit phone entries with deterministic refusal messaging @P0',
      async ({ request, storyB1Context, storyB1AuthorizedHeaders, storyB1NoPhonePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1NoPhonePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NEIGHBOR_PHONE_REQUIRED',
          refusalType: 'business',
          message: expect.stringContaining('at least one phone'),
        });
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );

    test(
      '[P0] refuses create requests when orgUnit scope crosses tenant boundaries with no identity leakage @P0',
      async ({ request, storyB1Context, storyB1AuthorizedHeaders, storyB1CrossTenantPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1CrossTenantPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
          tenantId: null,
        });
        expect(body).not.toHaveProperty('data.neighbor');
      },
    );

    test(
      '[P1] refuses invalid phone formats with deterministic refusal code and no normalized-phone leakage @P1',
      async ({ request, storyB1Context, storyB1AuthorizedHeaders, storyB1InvalidPhonePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1InvalidPhonePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NEIGHBOR_PHONE_INVALID_FORMAT',
          refusalType: 'business',
          message: expect.stringContaining('phone'),
        });
        expect(body).not.toHaveProperty('data.normalizedPhones');
      },
    );

    test(
      '[P1] refuses callers without neighbor-create capability before mutation processing @P1',
      async ({ request, storyB1Context, storyB1TenantViewerHeaders, storyB1ValidPayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1TenantViewerHeaders,
          data: storyB1ValidPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NEIGHBOR_CREATE_FORBIDDEN',
          refusalType: 'business',
        });
      },
    );

    test(
      '[P1] preserves canonical envelope keys across success and refusal paths for neighbor create @P1',
      async ({ request, storyB1Context, storyB1AuthorizedHeaders, storyB1ValidPayload, storyB1NoPhonePayload }) => {
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1ValidPayload,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: storyB1Context.paths.neighborsCollection,
          headers: storyB1AuthorizedHeaders,
          data: storyB1NoPhonePayload,
        });

        expect(successResponse.status()).toBe(201);
        expect(refusalResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
      },
    );
  },
);
