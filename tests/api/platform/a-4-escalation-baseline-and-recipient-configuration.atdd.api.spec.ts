import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryA4Context,
  createStoryA4Headers,
} from '../../support/factories/connectShyftStoryA4Factory';

test.describe(
  'Story a.4 Escalation Baseline and Recipient Configuration (ATDD API RED)',
  () => {
    const context = createStoryA4Context();

    test.skip(
      '[P0] persists valid escalation baseline and recipient targets for orgUnit-scoped configuration @P0',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.validBaselineHours,
            recipients: {
              ...context.recipients,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.validBaselineHours,
            recipients: expect.objectContaining({
              primaryOrgUnitAdminUserId: context.recipients.primaryOrgUnitAdminUserId,
              secondaryOrgUnitAdminUserId: context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: context.recipients.tenantStaffUserId,
            }),
          },
        });
      },
    );

    test.skip(
      '[P0] applies default baseline of 24 hours when baseline is omitted and recipients are valid @P0',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            recipients: {
              ...context.recipients,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_ESCALATION_CONFIG_SAVED',
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.defaultBaselineHours,
          },
        });
      },
    );

    test.skip(
      '[P0] refuses baseline values outside 1-24 hours and keeps prior configuration unchanged @P0',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.invalidBaselineHigh,
            recipients: {
              ...context.recipients,
            },
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ESCALATION_BASELINE_INVALID_RANGE',
          refusalType: 'business',
          message: expect.stringContaining('1-24'),
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

    test.skip(
      '[P0] refuses non-integer baseline values and returns deterministic field-level refusal details @P0',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.invalidBaselineFractional,
            recipients: {
              ...context.recipients,
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

    test.skip(
      '[P0] blocks save when required primary recipient assignment is missing @P0',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.validBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: '',
              secondaryOrgUnitAdminUserId: context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: context.recipients.tenantStaffUserId,
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

    test.skip(
      '[P1] refuses cross-tenant recipient assignments with deterministic refusal semantics @P1',
      async ({ request }) => {
        const headers = createStoryA4Headers(context, {
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'PUT',
          path: context.paths.escalationConfig,
          headers,
          data: {
            orgUnitId: context.orgUnitId,
            escalationBaselineHours: context.validBaselineHours,
            recipients: {
              primaryOrgUnitAdminUserId: context.crossTenantRecipientUserId,
              secondaryOrgUnitAdminUserId: context.recipients.secondaryOrgUnitAdminUserId,
              tenantStaffUserId: context.recipients.tenantStaffUserId,
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
