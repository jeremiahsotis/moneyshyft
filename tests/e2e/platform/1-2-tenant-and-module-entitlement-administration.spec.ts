import { apiRequest } from '../../support/helpers/apiClient';
import {
  createInitialTenantAdminPayload,
  createModuleEntitlementPayload,
  createOrgUnitPayload,
  createRoleAssignmentPayload,
} from '../../support/factories/tenantEntitlementFactory';
import { test, expect } from '../../support/fixtures/tenantEntitlementStory12.fixture';

test.describe('Story 1.2 automate - tenant and module entitlement administration journey', () => {
  test('[P0] applies module disable and blocks protected module scope in the same journey @P0', async ({
    request,
    story12Context,
    tenantAdminHeaders,
  }) => {
    const disableResponse = await apiRequest(request, {
      method: 'PATCH',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/modules/${story12Context.moduleKey}/entitlement`,
      headers: tenantAdminHeaders,
      data: createModuleEntitlementPayload({
        enabled: false,
        reason: 'suspend-module',
      }),
    });

    expect(disableResponse.status()).toBe(200);

    const protectedProbeResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/modules/${story12Context.moduleKey}/access-probe`,
      headers: tenantAdminHeaders,
      data: {
        action: 'read-dashboard',
      },
    });

    expect(protectedProbeResponse.status()).toBe(200);
    const probeBody = await protectedProbeResponse.json();
    expect(probeBody).toMatchObject({
      ok: false,
      refusal: {
        code: 'MODULE_ENTITLEMENT_DISABLED',
      },
    });
  });

  test('[P0] preserves orgUnit-scoped authorization immediately after role assignment changes @P0', async ({
    request,
    story12Context,
    tenantAdminHeaders,
  }) => {
    const orgUnitResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/org-units`,
      headers: tenantAdminHeaders,
      data: createOrgUnitPayload(story12Context),
    });

    expect(orgUnitResponse.status()).toBe(201);
    const orgUnitBody = await orgUnitResponse.json();

    const assignmentResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/role-assignments`,
      headers: tenantAdminHeaders,
      data: createRoleAssignmentPayload(story12Context, {
        orgUnitId: orgUnitBody.data.orgUnit.id,
        role: 'ORGUNIT_MEMBER',
      }),
    });

    expect(assignmentResponse.status()).toBe(201);

    const authorizationProbe = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/authorization/probe`,
      headers: tenantAdminHeaders,
      data: {
        userId: story12Context.assigneeUserId,
        action: 'orgunit.view',
        orgUnitId: orgUnitBody.data.orgUnit.id,
      },
    });

    expect(authorizationProbe.status()).toBe(200);
    const probeBody = await authorizationProbe.json();
    expect(probeBody).toMatchObject({
      ok: true,
      data: {
        allowed: true,
        tenantId: story12Context.tenantId,
        orgUnitId: orgUnitBody.data.orgUnit.id,
      },
    });
  });

  test('[P1] keeps outbox/audit metadata deterministic across entitlement and role mutations @P1', async ({
    request,
    story12Context,
    tenantAdminHeaders,
  }) => {
    const entitlementResponse = await apiRequest(request, {
      method: 'PATCH',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/modules/${story12Context.moduleKey}/entitlement`,
      headers: tenantAdminHeaders,
      data: createModuleEntitlementPayload({ enabled: true, reason: 'reactivate-module' }),
    });

    expect(entitlementResponse.status()).toBe(200);
    const entitlementBody = await entitlementResponse.json();

    const roleMutationResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/role-assignments`,
      headers: tenantAdminHeaders,
      data: createRoleAssignmentPayload(story12Context, {
        role: 'TENANT_STAFF',
      }),
    });

    expect(roleMutationResponse.status()).toBe(201);
    const roleBody = await roleMutationResponse.json();

    expect(entitlementBody.data.audit.tenantId).toBe(story12Context.tenantId);
    expect(roleBody.data.audit.tenantId).toBe(story12Context.tenantId);
    expect(entitlementBody.data.outbox.persisted).toBe(true);
    expect(roleBody.data.outbox.persisted).toBe(true);
  });

  test('[P1] enforces system-admin-only bootstrap in journey sequence @P1', async ({
    request,
    story12Context,
    tenantAdminHeaders,
    systemAdminHeaders,
  }) => {
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/initial-tenant-admin`,
      headers: tenantAdminHeaders,
      data: createInitialTenantAdminPayload(story12Context),
    });

    expect(refusalResponse.status()).toBe(200);
    const refusalBody = await refusalResponse.json();
    expect(refusalBody).toMatchObject({
      ok: false,
      refusal: {
        code: 'INITIAL_TENANT_ADMIN_REQUIRES_SYSTEM_ADMIN',
      },
    });

    const grantResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${story12Context.tenantId}/initial-tenant-admin`,
      headers: systemAdminHeaders,
      data: createInitialTenantAdminPayload(story12Context),
    });

    expect(grantResponse.status()).toBe(201);
    const grantBody = await grantResponse.json();
    expect(grantBody).toMatchObject({
      ok: true,
      data: {
        tenantId: story12Context.tenantId,
        assignedRole: 'TENANT_ADMIN',
      },
    });
  });
});
