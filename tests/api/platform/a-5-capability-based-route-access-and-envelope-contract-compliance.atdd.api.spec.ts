import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryA5Context,
  createStoryA5Headers,
} from '../../support/factories/connectShyftStoryA5Factory';

test.describe(
  'Story a.5 Capability-Based Route Access and Envelope Contract Compliance (ATDD API)',
  () => {
    const context = createStoryA5Context();

    test(
      '[P0] refuses inbox route access for roles without thread-view capability at endpoint boundary @P0',
      async ({ request }) => {
        const headers = createStoryA5Headers(context, {
          role: 'UNKNOWN_ROLE',
          userId: context.unauthorizedUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'GET',
          path: context.paths.inbox,
          headers,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_VIEW_FORBIDDEN',
          refusalType: 'business',
          message: expect.stringContaining('authorized ConnectShyft role'),
        });
        expect(body).not.toHaveProperty('data.items');
      },
    );

    test(
      '[P0] enforces claim and takeover capability checks for tenant-viewer callers @P0',
      async ({ request }) => {
        const headers = createStoryA5Headers(context, {
          role: 'TENANT_VIEWER',
          userId: context.tenantViewerUserId,
        });

        const claimResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadClaim,
          headers,
          data: {
            reason: 'atdd-a5-claim-forbidden',
          },
        });

        const takeoverResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadTakeover,
          headers,
          data: {
            reason: 'atdd-a5-takeover-forbidden',
          },
        });

        expect(claimResponse.status()).toBe(200);
        expect(takeoverResponse.status()).toBe(200);

        const claimBody = await claimResponse.json();
        const takeoverBody = await takeoverResponse.json();

        expect(claimBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
        });
        expect(takeoverBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_TAKEOVER_FORBIDDEN',
          refusalType: 'business',
        });

        expect(claimBody).not.toHaveProperty('data.threadId');
        expect(takeoverBody).not.toHaveProperty('data.threadId');
      },
    );

    test(
      '[P0] blocks unauthorized number-mapping mutation and preserves prior state at service boundary @P0',
      async ({ request }) => {
        const adminHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.orgUnitAdminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const memberHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.orgUnitMemberUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const uniqueSuffix = Date.now().toString().slice(-4);
        const createdNumber = `+1260555${uniqueSuffix}`;
        const updatedNumber = `+1260666${uniqueSuffix}`;

        const createResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: createdNumber,
            label: 'A5 capability seed mapping',
            isActive: true,
          },
        });

        expect(createResponse.status()).toBe(201);
        const createBody = await createResponse.json();
        expect(createBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
        });

        const createdMappingId =
          typeof createBody?.data?.mappingId === 'string'
            ? createBody.data.mappingId
            : context.existingMappingId;

        const forbiddenUpdate = await apiRequest(request, {
          method: 'PUT',
          path: `/api/v1/connectshyft/numbers/${createdMappingId}`,
          headers: memberHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            twilioNumberE164: updatedNumber,
            label: 'A5 forbidden overwrite',
            isActive: true,
          },
        });

        expect(forbiddenUpdate.status()).toBe(200);
        const forbiddenBody = await forbiddenUpdate.json();
        expect(forbiddenBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
          refusalType: 'business',
        });

        const listResponse = await apiRequest(request, {
          method: 'GET',
          path: context.paths.numbersCollection,
          headers: adminHeaders,
        });

        expect(listResponse.status()).toBe(200);
        const listBody = await listResponse.json();
        expect(listBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
          data: {
            mappings: expect.arrayContaining([
              expect.objectContaining({
                mappingId: createdMappingId,
                twilioNumberE164: createdNumber,
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P0] blocks unauthorized escalation overwrite and preserves persisted baseline at service boundary @P0',
      async ({ request }) => {
        const adminHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.orgUnitAdminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const memberHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_MEMBER',
          userId: context.orgUnitMemberUserId,
          orgUnitMemberships: [context.orgUnitId],
        });

        const saveResponse = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.validEscalationBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
              secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
              tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
            },
          },
        });

        expect(saveResponse.status()).toBe(200);
        const saveBody = await saveResponse.json();
        expect(saveBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            escalationBaselineHours: context.validEscalationBaselineHours,
          },
        });

        const forbiddenSave = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers: memberHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: 2,
            recipients: {
              primaryOrgUnitAdminUserId: 'user-connectshyft-a4-primary-recipient',
              secondaryOrgUnitAdminUserId: 'user-connectshyft-a4-secondary-recipient',
              tenantStaffUserId: 'user-connectshyft-a4-tenant-staff-recipient',
            },
          },
        });

        expect(forbiddenSave.status()).toBe(200);
        const forbiddenBody = await forbiddenSave.json();
        expect(forbiddenBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_FORBIDDEN',
          refusalType: 'business',
        });

        const readBack = await apiRequest(request, {
          method: 'GET',
          path: context.paths.escalationConfig,
          headers: adminHeaders,
        });

        expect(readBack.status()).toBe(200);
        const readBackBody = await readBack.json();
        expect(readBackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
          data: {
            escalationBaselineHours: context.validEscalationBaselineHours,
          },
        });
      },
    );

    test(
      '[P1] capability refusals keep canonical envelope keys and exclude privileged payload data @P1',
      async ({ request }) => {
        const headers = createStoryA5Headers(context, {
          role: 'TENANT_VIEWER',
          userId: context.tenantViewerUserId,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadClaim,
          headers,
          data: {
            reason: 'atdd-a5-no-leak',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
          correlationId: expect.any(String),
          tenantId: context.tenantId,
          message: expect.any(String),
        });

        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.context');
      },
    );

    test(
      '[P1] keeps success refusal and system-error envelope contracts consistent across ConnectShyft APIs @P1',
      async ({ request }) => {
        const adminHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.orgUnitAdminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const viewerHeaders = createStoryA5Headers(context, {
          role: 'TENANT_VIEWER',
          userId: context.tenantViewerUserId,
        });

        const successResponse = await apiRequest(request, {
          method: 'GET',
          path: context.paths.inbox,
          headers: adminHeaders,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadTakeover,
          headers: viewerHeaders,
          data: {
            reason: 'atdd-a5-envelope-refusal',
          },
        });
        const systemErrorResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.envelopeSystemErrorContract,
          headers: adminHeaders,
          data: {
            reason: 'atdd-a5-system-error-probe',
          },
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);
        expect(systemErrorResponse.status()).toBe(500);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const systemErrorBody = await systemErrorResponse.json();

        const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(systemErrorBody, key))).toBe(true);

        expect(systemErrorBody).toMatchObject({
          ok: false,
          errorType: 'system',
          code: expect.any(String),
          message: expect.any(String),
        });
        expect(systemErrorBody).not.toHaveProperty('stack');
      },
    );
  },
);
