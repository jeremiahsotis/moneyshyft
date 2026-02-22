import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryA3Context,
  createStoryA3Headers,
} from '../../support/factories/connectShyftStoryA3Factory';

test.describe(
  'Story a.3 OrgUnit Number Mapping Management (ATDD API RED)',
  () => {
    const context = createStoryA3Context();

    test.skip(
      '[P0] creates multiple valid Twilio E.164 number mappings for the same orgUnit with deterministic read-back @P0',
      async ({ request }) => {
        const headers = createStoryA3Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const firstCreate = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.validPrimaryNumber,
            label: 'Primary Dispatch',
            isActive: true,
          },
        });

        const secondCreate = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.validSecondaryNumber,
            label: 'Overflow Dispatch',
            isActive: true,
          },
        });

        expect(firstCreate.status()).toBe(201);
        expect(secondCreate.status()).toBe(201);

        const secondBody = await secondCreate.json();
        expect(secondBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          data: {
            orgUnitId: context.orgUnitId,
            mappings: expect.arrayContaining([
              expect.objectContaining({
                twilioNumberE164: context.validPrimaryNumber,
              }),
              expect.objectContaining({
                twilioNumberE164: context.validSecondaryNumber,
              }),
            ]),
          },
        });
      },
    );

    test.skip(
      '[P0] updates an existing number mapping to a new valid E.164 number while keeping orgUnit multi-number support intact @P0',
      async ({ request }) => {
        const headers = createStoryA3Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.numbersById,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.validUpdatedNumber,
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
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.validUpdatedNumber,
          },
        });
      },
    );

    test.skip(
      '[P0] blocks non-E.164 number input with actionable validation feedback before persistence @P0',
      async ({ request }) => {
        const headers = createStoryA3Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.invalidNonE164Number,
            label: 'Invalid Mapping',
            isActive: true,
          },
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
      },
    );

    test.skip(
      '[P0] rejects duplicate (tenant_id, twilio_number_e164) mappings across orgUnits with stable refusal envelope @P0',
      async ({ request }) => {
        const eastHeaders = createStoryA3Headers(context, {
          orgUnitId: context.orgUnitId,
          orgUnitMemberships: [context.orgUnitId, 'org-connectshyft-alpha-west'],
        });
        const westHeaders = createStoryA3Headers(context, {
          orgUnitId: 'org-connectshyft-alpha-west',
          orgUnitMemberships: [context.orgUnitId, 'org-connectshyft-alpha-west'],
        });

        await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: eastHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: context.duplicateTenantNumber,
            label: 'Tenant Shared Duplicate Candidate',
            isActive: true,
          },
        });

        const duplicateAttempt = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: westHeaders,
          data: {
            orgUnitId: 'org-connectshyft-alpha-west',
            twilioNumberE164: context.duplicateTenantNumber,
            label: 'Duplicate Tenant Number',
            isActive: true,
          },
        });

        expect(duplicateAttempt.status()).toBe(200);
        const body = await duplicateAttempt.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_DUPLICATE',
          refusalType: 'business',
          message: expect.stringContaining('already mapped'),
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

    test.skip(
      '[P1] enforces tenant and orgUnit boundary checks for number-mapping writes to prevent cross-tenant leakage @P1',
      async ({ request }) => {
        const headers = createStoryA3Headers(context, {
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers,
          data: {
            orgUnitId: context.crossTenantOrgUnitId,
            twilioNumberE164: '+12605550166',
            label: 'Cross Tenant Attempt',
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
  },
);
