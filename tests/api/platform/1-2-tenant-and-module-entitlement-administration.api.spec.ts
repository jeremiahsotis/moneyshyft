import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createInitialTenantAdminPayload,
  createModuleEntitlementPayload,
  createOrgUnitPayload,
  createRoleAssignmentPayload,
  createStory12Context,
  createStory12TenantHeaders,
} from '../../support/factories/tenantEntitlementFactory';

test.describe('Story 1.2 automate - tenant and module entitlement administration API coverage', () => {
  test('[P0] toggles module entitlement with immediate authorization state update @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    const headers = createStory12TenantHeaders(context);
    const payload = createModuleEntitlementPayload({
      enabled: false,
      reason: 'suspend-module',
    });

    const response = await apiRequest(request, {
      method: 'PATCH',
      path: `/api/v1/platform/tenants/${context.tenantId}/modules/${context.moduleKey}/entitlement`,
      headers,
      data: payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      data: {
        tenantId: context.tenantId,
        moduleKey: context.moduleKey,
        enabled: false,
        authorizationUpdated: true,
      },
    });
  });

  test('[P0] creates and updates orgUnit scope while preserving tenant boundary @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    const headers = createStory12TenantHeaders(context);

    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${context.tenantId}/org-units`,
      headers,
      data: createOrgUnitPayload(context),
    });

    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    expect(created).toMatchObject({
      ok: true,
      data: {
        orgUnit: {
          tenantId: context.tenantId,
          code: context.orgUnitCode,
        },
      },
    });

    const updateResponse = await apiRequest(request, {
      method: 'PUT',
      path: `/api/v1/platform/tenants/${context.tenantId}/org-units/${created.data.orgUnit.id}`,
      headers,
      data: {
        name: 'Regional Operations',
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated).toMatchObject({
      ok: true,
      data: {
        authorizationUpdated: true,
      },
    });
  });

  test('[P0] emits audit and outbox metadata for role assignment mutations @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    const headers = createStory12TenantHeaders(context);

    const orgUnitResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${context.tenantId}/org-units`,
      headers,
      data: createOrgUnitPayload(context),
    });
    expect(orgUnitResponse.status()).toBe(201);
    const orgUnitBody = await orgUnitResponse.json();

    const assignmentResponse = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${context.tenantId}/role-assignments`,
      headers,
      data: createRoleAssignmentPayload(context, {
        orgUnitId: orgUnitBody.data.orgUnit.id,
      }),
    });

    expect(assignmentResponse.status()).toBe(201);
    const assignmentBody = await assignmentResponse.json();
    expect(assignmentBody).toMatchObject({
      ok: true,
      data: {
        audit: {
          tenantId: context.tenantId,
          scopeLayer: 'ORGUNIT',
          reason: 'operations-coverage',
        },
        outbox: {
          persisted: true,
          eventType: 'platform.tenant.role-assignment.changed',
        },
      },
    });
  });

  test('[P1] refuses initial tenant admin assignment for non-system actors @P1', async ({
    request,
  }) => {
    const context = createStory12Context();
    const headers = createStory12TenantHeaders(context, { role: 'TENANT_ADMIN' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${context.tenantId}/initial-tenant-admin`,
      headers,
      data: createInitialTenantAdminPayload(context),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      refusal: {
        code: 'INITIAL_TENANT_ADMIN_REQUIRES_SYSTEM_ADMIN',
        layer: 'AUTHORIZATION',
      },
    });
  });

  test('[P1] allows system admin to assign initial tenant admin once for tenant bootstrap @P1', async ({
    request,
  }) => {
    const context = createStory12Context();
    const headers = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: `/api/v1/platform/tenants/${context.tenantId}/initial-tenant-admin`,
      headers,
      data: createInitialTenantAdminPayload(context),
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      data: {
        tenantId: context.tenantId,
        assigneeUserId: context.assigneeUserId,
        assignedRole: 'TENANT_ADMIN',
      },
    });
  });
});
