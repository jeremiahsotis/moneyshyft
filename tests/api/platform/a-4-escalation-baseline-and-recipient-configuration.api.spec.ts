import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryA4.fixture';
import { createStoryA4Headers } from '../../support/factories/connectShyftStoryA4Factory';

test.describe(
  'Story a.4 automate - escalation baseline and recipient configuration API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P1] resolves scoped recipient options for escalation configuration @P1',
      async ({ request, storyA4Context, storyA4AdminHeaders }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: '/api/v1/connectshyft/escalation/recipients',
          headers: storyA4AdminHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_RECIPIENTS_RESOLVED',
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            recipientOptions: expect.arrayContaining([
              expect.objectContaining({
                value: storyA4Context.recipients.primaryOrgUnitAdminUserId,
              }),
              expect.objectContaining({
                value: storyA4Context.recipients.secondaryOrgUnitAdminUserId,
              }),
              expect.objectContaining({
                value: storyA4Context.recipients.tenantStaffUserId,
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P0] persists valid escalation baseline and recipient targets for orgUnit-scoped configuration @P0',
      async ({ request, storyA4Context, storyA4AdminHeaders, storyA4ValidConfigPayload }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: storyA4ValidConfigPayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.validBaselineHours,
            recipients: expect.objectContaining({
              primaryOrgUnitAdminUserId: storyA4Context.recipients.primaryOrgUnitAdminUserId,
              secondaryOrgUnitAdminUserId: storyA4Context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: storyA4Context.recipients.tenantStaffUserId,
            }),
          },
        });
      },
    );

    test(
      '[P0] applies default baseline of 24 hours when baseline is omitted and recipients are valid @P0',
      async ({ request, storyA4Context, storyA4AdminHeaders }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            recipients: {
              ...storyA4Context.recipients,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.defaultBaselineHours,
          },
        });
      },
    );

    test(
      '[P0] refuses baseline values outside 1-24 hours with deterministic range-refusal details @P0',
      async ({ request, storyA4Context, storyA4AdminHeaders, storyA4InvalidRangePayload }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: storyA4InvalidRangePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'escalationBaselineHours',
                reason: 'OUT_OF_RANGE',
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P0] refuses non-integer baseline values with deterministic field-level refusal details @P0',
      async ({ request, storyA4Context, storyA4AdminHeaders }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.invalidBaselineFractional,
            recipients: {
              ...storyA4Context.recipients,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_INTEGER',
          refusalType: 'business',
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'escalationBaselineHours',
                reason: 'NOT_INTEGER',
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P0] blocks persistence when required primary recipient assignment is missing @P0',
      async ({ request, storyA4Context, storyA4AdminHeaders }) => {
        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.validBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: '',
              secondaryOrgUnitAdminUserId: storyA4Context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: storyA4Context.recipients.tenantStaffUserId,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_REQUIRED',
          refusalType: 'business',
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'recipients.primaryOrgUnitAdminUserId',
              }),
            ]),
          },
        });
      },
    );

    test(
      '[P1] keeps previously saved configuration unchanged after a refused invalid update @P1',
      async ({ request, storyA4Context, storyA4AdminHeaders, storyA4ValidConfigPayload }) => {
        const initialSaveResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: storyA4ValidConfigPayload,
        });
        expect(initialSaveResponse.status()).toBe(200);
        const initialSaveBody = await initialSaveResponse.json();
        expect(initialSaveBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.validBaselineHours,
          },
        });

        const refusedUpdateResponse = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.invalidBaselineHigh,
            recipients: {
              ...storyA4Context.recipients,
            },
          },
        });
        expect(refusedUpdateResponse.status()).toBe(200);
        const refusedUpdateBody = await refusedUpdateResponse.json();
        expect(refusedUpdateBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
        });

        const resolvedConfigResponse = await apiRequest(request, {
          method: 'GET',
          path: storyA4Context.paths.escalationConfig,
          headers: storyA4AdminHeaders,
        });
        expect(resolvedConfigResponse.status()).toBe(200);
        const resolvedConfigBody = await resolvedConfigResponse.json();
        expect(resolvedConfigBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_RESOLVED',
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.validBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: storyA4Context.recipients.primaryOrgUnitAdminUserId,
              secondaryOrgUnitAdminUserId: storyA4Context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: storyA4Context.recipients.tenantStaffUserId,
            },
          },
        });
      },
    );

    test(
      '[P1] refuses cross-tenant recipient assignments with deterministic refusal semantics @P1',
      async ({ request, storyA4Context }) => {
        const headers = createStoryA4Headers(storyA4Context, {
          orgUnitMemberships: [storyA4Context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: storyA4Context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: storyA4Context.orgUnitId,
            escalationBaselineHours: storyA4Context.validBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: storyA4Context.crossTenantRecipientUserId,
              secondaryOrgUnitAdminUserId: storyA4Context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: storyA4Context.recipients.tenantStaffUserId,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_RECIPIENT_INVALID_ASSIGNMENT',
          refusalType: 'business',
          data: {
            fieldErrors: expect.arrayContaining([
              expect.objectContaining({
                field: 'recipients.primaryOrgUnitAdminUserId',
                reason: 'RECIPIENT_OUTSIDE_TENANT_OR_ORGUNIT_SCOPE',
              }),
            ]),
          },
        });
      },
    );
  },
);
