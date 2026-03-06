import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryA5.fixture';
import { createStoryA5Headers } from '../../support/factories/connectShyftStoryA5Factory';

test.describe(
  'Story a.5 automate - capability-based route access and envelope contract API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] refuses number mapping reads for roles lacking number-management capability @P0',
      async ({ request, storyA5Context, storyA5TenantViewerHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.numbersCollection,
          headers: storyA5TenantViewerHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
          refusalType: 'business',
          message: expect.stringContaining('authorized ConnectShyft role'),
        });
        expect(body).not.toHaveProperty('data.mappings');
      },
    );

    test(
      '[P1] legacy jwt role aliases map admin to tenant-admin capabilities for inbox access @P1',
      async ({ request, storyA5Context }) => {
        const legacyAdminHeaders = createStoryA5Headers(storyA5Context, {
          role: 'admin',
          userId: storyA5Context.tenantAdminUserId,
          orgUnitMemberships: [storyA5Context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.inbox,
          headers: legacyAdminHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_READY',
          tenantId: storyA5Context.tenantId,
          data: {
            context: {
              orgUnitId: storyA5Context.orgUnitId,
            },
          },
        });
      },
    );

    test(
      '[P0] blocks unauthorized number mapping writes and preserves prior orgUnit mapping state @P0',
      async ({
        request,
        storyA5Context,
        storyA5OrgUnitAdminHeaders,
        storyA5OrgUnitMemberHeaders,
      }) => {
        const uniqueSuffix = Date.now().toString().slice(-6);
        const seededNumber = `+1260777${uniqueSuffix}`;
        const forbiddenNumber = `+1260888${uniqueSuffix}`;

        const createByAdmin = await apiRequest(request, {
          method: 'POST',
          path: storyA5Context.paths.numbersCollection,
          headers: storyA5OrgUnitAdminHeaders,
          data: {
            orgUnitId: storyA5Context.orgUnitId,
            twilioNumberE164: seededNumber,
            label: 'A5 Seed Mapping',
            isActive: true,
          },
        });

        expect(createByAdmin.status()).toBe(201);
        const seededBody = await createByAdmin.json();
        expect(seededBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_SAVED',
          data: {
            twilioNumberE164: seededNumber,
          },
        });

        const forbiddenWrite = await apiRequest(request, {
          method: 'POST',
          path: storyA5Context.paths.numbersCollection,
          headers: storyA5OrgUnitMemberHeaders,
          data: {
            orgUnitId: storyA5Context.orgUnitId,
            twilioNumberE164: forbiddenNumber,
            label: 'A5 Forbidden Mapping',
            isActive: true,
          },
        });

        expect(forbiddenWrite.status()).toBe(200);
        const forbiddenBody = await forbiddenWrite.json();
        expect(forbiddenBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
          refusalType: 'business',
        });
        expect(forbiddenBody).not.toHaveProperty('data.mappingId');

        const readBack = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.numbersCollection,
          headers: storyA5OrgUnitAdminHeaders,
        });

        expect(readBack.status()).toBe(200);
        const readBackBody = await readBack.json();
        expect(readBackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_NUMBER_MAPPINGS_RESOLVED',
          data: {
            orgUnitId: storyA5Context.orgUnitId,
          },
        });
        expect(readBackBody.data?.mappings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              twilioNumberE164: seededNumber,
            }),
          ]),
        );
        expect(
          (readBackBody.data?.mappings ?? []).some(
            (mapping: { twilioNumberE164?: string }) =>
              mapping.twilioNumberE164 === forbiddenNumber,
          ),
        ).toBe(false);
      },
    );

    test(
      '[P0] refuses escalation configuration writes without capability and preserves prior saved baseline @P0',
      async ({
        request,
        storyA5Context,
        storyA5OrgUnitAdminHeaders,
        storyA5OrgUnitMemberHeaders,
        storyA5ValidEscalationPayload,
      }) => {
        const saveByAdmin = await apiRequest(request, {
          method: 'PUT',
          path: storyA5Context.paths.escalationConfig,
          headers: storyA5OrgUnitAdminHeaders,
          data: storyA5ValidEscalationPayload,
        });

        expect(saveByAdmin.status()).toBe(200);
        const savedBody = await saveByAdmin.json();
        expect(savedBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: storyA5Context.orgUnitId,
            escalationBaselineHours: storyA5Context.validEscalationBaselineHours,
          },
        });

        const forbiddenSave = await apiRequest(request, {
          method: 'PUT',
          path: storyA5Context.paths.escalationConfig,
          headers: storyA5OrgUnitMemberHeaders,
          data: {
            orgUnitId: storyA5Context.orgUnitId,
            escalationBaselineHours: storyA5Context.fallbackEscalationBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: storyA5Context.orgUnitAdminUserId,
              secondaryOrgUnitAdminUserId: storyA5Context.orgUnitMemberUserId,
              tenantStaffUserId: storyA5Context.tenantStaffUserId,
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
        expect(forbiddenBody).not.toHaveProperty('data.escalationBaselineHours');

        const readBack = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.escalationConfig,
          headers: storyA5OrgUnitAdminHeaders,
        });

        expect(readBack.status()).toBe(200);
        const readBackBody = await readBack.json();
        expect(readBackBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
          data: {
            orgUnitId: storyA5Context.orgUnitId,
          },
        });
        expect(readBackBody?.data?.escalationBaselineHours).not.toBe(
          storyA5Context.fallbackEscalationBaselineHours,
        );
      },
    );

    test(
      '[P1] capability refusals keep canonical envelope keys and no thread-id leakage on blocked claim attempts @P1',
      async ({ request, storyA5Context, storyA5TenantViewerHeaders }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyA5Context.paths.threadClaim,
          headers: storyA5TenantViewerHeaders,
          data: {
            reason: 'a5-claim-no-membership',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();

        const requiredKeys = [
          'ok',
          'code',
          'message',
          'correlationId',
          'tenantId',
        ];

        expect(
          requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(body, key)),
        ).toBe(true);
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
          correlationId: expect.any(String),
          tenantId: storyA5Context.tenantId,
        });
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.context');
      },
    );

    test(
      '[P1] preserves shared envelope key consistency across success refusal and system-error contract paths @P1',
      async ({
        request,
        storyA5Context,
        storyA5OrgUnitAdminHeaders,
        storyA5TenantViewerHeaders,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.inbox,
          headers: storyA5OrgUnitAdminHeaders,
        });

        const refusalResponse = await apiRequest(request, {
          method: 'GET',
          path: storyA5Context.paths.numbersCollection,
          headers: storyA5TenantViewerHeaders,
        });

        const systemErrorResponse = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
          headers: storyA5OrgUnitAdminHeaders,
          data: {
            reason: 'a5-envelope-system-error-probe',
          },
        });

        expect(successResponse.status()).toBe(200);
        expect(refusalResponse.status()).toBe(200);
        expect(systemErrorResponse.status()).toBe(500);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const systemErrorBody = await systemErrorResponse.json();

        const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];
        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(successBody, key),
          ),
        ).toBe(true);
        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(refusalBody, key),
          ),
        ).toBe(true);
        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(systemErrorBody, key),
          ),
        ).toBe(true);

        expect(successBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_READY',
          correlationId: expect.any(String),
          tenantId: storyA5Context.tenantId,
        });
        expect(refusalBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NUMBER_MAPPING_FORBIDDEN',
          refusalType: 'business',
          correlationId: expect.any(String),
          tenantId: storyA5Context.tenantId,
        });
        expect(systemErrorBody).toMatchObject({
          ok: false,
          errorType: 'system',
          code: 'ENVELOPE_SYSTEM_ERROR',
          message: expect.any(String),
          correlationId: expect.any(String),
          tenantId: storyA5Context.tenantId,
        });
        expect(systemErrorBody).not.toHaveProperty('stack');
      },
    );
  },
);
