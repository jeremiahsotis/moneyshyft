import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import { createTenantScopeHeaders } from '../../support/factories/tenantRepositoryFactory';
import { connectShyftContextEnforcementData } from '../../fixtures/test-data';

type StoryA2HeaderOverrides = {
  tenantId?: string;
  orgUnitId?: string | null;
  role?: string;
  userId?: string;
};

const createStoryA2Headers = (
  overrides: StoryA2HeaderOverrides = {},
): Record<string, string> => ({
  ...createTenantScopeHeaders({
    tenantId:
      overrides.tenantId ?? connectShyftContextEnforcementData.tenantAlphaId,
    orgUnitId:
      overrides.orgUnitId ?? connectShyftContextEnforcementData.orgUnitAlphaEastId,
    role: overrides.role ?? 'TENANT_STAFF',
    userId: overrides.userId ?? connectShyftContextEnforcementData.staffUserId,
  }),
  'x-test-connectshyft-flags': JSON.stringify(
    connectShyftContextEnforcementData.flagsAllEnabled,
  ),
});

test.describe(
  'Story a.2 Tenant and OrgUnit Context Enforcement for ConnectShyft Routes (ATDD API RED)',
  () => {
    test.skip(
      '[P0] refuses orgUnit-scoped inbox access when authenticated context omits orgUnit identity @P0',
      async ({ request }) => {
        const headers = createStoryA2Headers({
          orgUnitId: null,
          role: 'TENANT_STAFF',
          userId: connectShyftContextEnforcementData.staffUserId,
        });

        const response = await apiRequest(request, {
          method: 'GET',
          path: '/api/v1/connectshyft/inbox',
          headers,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_REQUIRED',
          refusalType: 'business',
          message: expect.stringContaining('orgUnit'),
        });
        expect(body).not.toHaveProperty('data');
      },
    );

    test.skip(
      '[P0] refuses invalid orgUnit context values before route data can be materialized @P0',
      async ({ request }) => {
        const headers = createStoryA2Headers({
          orgUnitId: 'invalid-orgunit-context',
          role: 'TENANT_STAFF',
          userId: connectShyftContextEnforcementData.staffUserId,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/connectshyft/threads',
          headers,
          data: {
            orgUnitId: 'invalid-orgunit-context',
            neighborId: 'neighbor-a2-1001',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_CONTEXT_INVALID',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
      },
    );

    test.skip(
      '[P0] blocks cross-tenant orgUnit spoof attempts with deterministic refusal and no thread leakage @P0',
      async ({ request }) => {
        const headers = createStoryA2Headers({
          tenantId: connectShyftContextEnforcementData.tenantAlphaId,
          orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaEastId,
          role: 'TENANT_STAFF',
          userId: connectShyftContextEnforcementData.staffUserId,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/connectshyft/threads',
          headers,
          data: {
            orgUnitId: connectShyftContextEnforcementData.orgUnitBravoNorthId,
            neighborId: 'neighbor-a2-1002',
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );

    test.skip(
      '[P1] requires orgUnit membership for non-privileged callers even when tenant context is valid @P1',
      async ({ request }) => {
        const headers = createStoryA2Headers({
          tenantId: connectShyftContextEnforcementData.tenantAlphaId,
          orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
          role: 'ORGUNIT_MEMBER',
          userId: connectShyftContextEnforcementData.nonMemberUserId,
        });

        const response = await apiRequest(request, {
          method: 'GET',
          path: '/api/v1/connectshyft/inbox',
          headers,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_MEMBERSHIP_REQUIRED',
          refusalType: 'business',
        });
        expect(body).not.toHaveProperty('data.items');
      },
    );

    test.skip(
      '[P1] allows tenant-privileged callers to bypass orgUnit membership while preserving canonical context metadata @P1',
      async ({ request }) => {
        const headers = createStoryA2Headers({
          tenantId: connectShyftContextEnforcementData.tenantAlphaId,
          orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
          role: 'TENANT_ADMIN',
          userId: connectShyftContextEnforcementData.tenantAdminUserId,
        });

        const response = await apiRequest(request, {
          method: 'GET',
          path: '/api/v1/connectshyft/inbox',
          headers,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_INBOX_READY',
          data: {
            context: {
              tenantId: connectShyftContextEnforcementData.tenantAlphaId,
              orgUnitId: connectShyftContextEnforcementData.orgUnitAlphaWestId,
              bypassedOrgUnitMembership: true,
            },
          },
        });
      },
    );
  },
);
