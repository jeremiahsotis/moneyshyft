import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryA3.fixture';
import { createStoryA3Headers } from '../../support/factories/connectShyftStoryA3Factory';

test.describe(
  'Story a.3 automate - orgUnit number mapping management API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] saves multiple valid E.164 mappings for one orgUnit and returns deterministic read-back payload @P0',
      async ({
        request,
        storyA3Context,
        storyA3AdminHeaders,
        storyA3CreatePrimaryPayload,
        storyA3CreateSecondaryPayload,
      }) => {
        const firstCreate = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: storyA3AdminHeaders,
          data: storyA3CreatePrimaryPayload,
        });

        const secondCreate = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: storyA3AdminHeaders,
          data: storyA3CreateSecondaryPayload,
        });

        expect(firstCreate.status()).toBe(201);
        expect(secondCreate.status()).toBe(201);

        const body = await secondCreate.json();
        const mappedNumbers = (body.data?.mappings ?? []).map(
          (mapping: { twilioNumberE164?: string }) => mapping.twilioNumberE164,
        );

        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          data: {
            orgUnitId: storyA3Context.orgUnitId,
          },
        });
        expect(mappedNumbers).toEqual([
          storyA3Context.validPrimaryNumber,
          storyA3Context.validSecondaryNumber,
        ]);
      },
    );

    test(
      '[P0] blocks duplicate tenant number mappings across orgUnits with actionable refusal and no mapping-id leakage @P0',
      async ({ request, storyA3Context }) => {
        const eastHeaders = createStoryA3Headers(storyA3Context, {
          orgUnitId: storyA3Context.orgUnitId,
          orgUnitMemberships: [
            storyA3Context.orgUnitId,
            storyA3Context.secondaryOrgUnitId,
          ],
        });
        const westHeaders = createStoryA3Headers(storyA3Context, {
          orgUnitId: storyA3Context.secondaryOrgUnitId,
          orgUnitMemberships: [
            storyA3Context.orgUnitId,
            storyA3Context.secondaryOrgUnitId,
          ],
        });

        await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: eastHeaders,
          data: {
            orgUnitId: storyA3Context.orgUnitId,
            twilioNumberE164: storyA3Context.duplicateTenantNumber,
            label: 'Primary Duplicate Candidate',
            isActive: true,
          },
        });

        const duplicateAttempt = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: westHeaders,
          data: {
            orgUnitId: storyA3Context.secondaryOrgUnitId,
            twilioNumberE164: storyA3Context.duplicateTenantNumber,
            label: 'West Duplicate Candidate',
            isActive: true,
          },
        });

        expect(duplicateAttempt.status()).toBe(200);
        const body = await duplicateAttempt.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
          refusalType: 'business',
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'twilioNumberE164',
                reason: 'DUPLICATE_TENANT_NUMBER',
              }),
            ]),
          },
        });
        expect(body).not.toHaveProperty('data.mappingId');
      },
    );

    test(
      '[P1] rejects non-E.164 mapping payloads with deterministic field-level refusal details @P1',
      async ({
        request,
        storyA3Context,
        storyA3AdminHeaders,
        storyA3InvalidNumberPayload,
      }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: storyA3AdminHeaders,
          data: storyA3InvalidNumberPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_INVALID_E164',
          refusalType: 'business',
          message: expect.stringContaining('E.164'),
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'twilioNumberE164',
              }),
            ]),
          },
        });
        expect(body).not.toHaveProperty('data.mappingId');
      },
    );

    test(
      '[P1] enforces tenant and orgUnit boundary checks on number-mapping writes @P1',
      async ({ request, storyA3Context }) => {
        const crossTenantHeaders = createStoryA3Headers(storyA3Context, {
          tenantId: storyA3Context.tenantId,
          orgUnitId: storyA3Context.orgUnitId,
          orgUnitMemberships: [storyA3Context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: crossTenantHeaders,
          data: {
            orgUnitId: storyA3Context.crossTenantOrgUnitId,
            twilioNumberE164: '+12605550166',
            label: 'Cross Tenant Write',
            isActive: true,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.mappingId');
      },
    );

    test(
      '[P1] updates existing mapping to a new valid E.164 value while preserving orgUnit scope metadata @P1',
      async ({ request, storyA3Context, storyA3AdminHeaders }) => {
        const createResponse = await apiRequest(request, {
          method: 'POST',
          path: storyA3Context.paths.numbersCollection,
          headers: storyA3AdminHeaders,
          data: {
            orgUnitId: storyA3Context.orgUnitId,
            twilioNumberE164: '+12605550601',
            label: 'Primary Dispatch',
            isActive: true,
          },
        });
        expect(createResponse.status()).toBe(201);
        const createdBody = await createResponse.json();
        const mappingId = createdBody?.data?.mappingId;
        expect(typeof mappingId).toBe('string');

        const response = await apiRequest(request, {
          method: 'PUT',
          path: `${storyA3Context.paths.numbersCollection}/${mappingId as string}`,
          headers: storyA3AdminHeaders,
          data: {
            orgUnitId: storyA3Context.orgUnitId,
            twilioNumberE164: storyA3Context.validUpdatedNumber,
            label: 'Primary Dispatch Updated',
            isActive: true,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_UPDATED',
          data: {
            mappingId: expect.any(String),
            orgUnitId: storyA3Context.orgUnitId,
            twilioNumberE164: storyA3Context.validUpdatedNumber,
          },
        });
      },
    );
  },
);
