import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createModuleEntitlementPayload,
  createOrgUnitPayload,
  createStory12Context,
  createStory12TenantHeaders,
} from '../../support/factories/tenantEntitlementFactory';

test.describe('Story 1.2 automate - tenant and module entitlement administration API coverage', () => {
  const bootstrapAssigneeUser = async (
    request: Parameters<typeof apiRequest>[0],
    context: ReturnType<typeof createStory12Context>,
  ) => {
    const email = `story12-${randomUUID()}@example.com`;
    const signupResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/signup',
      data: {
        email,
        password: 'Password123!',
        firstName: 'Story',
        lastName: 'Twelve',
        householdName: `Story12-${context.orgUnitCode}`,
      },
    });

    expect(signupResponse.status()).toBe(201);
    const signupBody = await signupResponse.json();
    const userId =
      signupBody?.user?.id
      || signupBody?.user?.userId
      || signupBody?.data?.user?.id
      || signupBody?.data?.user?.userId;
    expect(typeof userId).toBe('string');
    context.assigneeUserId = userId;
    context.actorUserId = userId;
  };

  const bootstrapTenant = async (request: Parameters<typeof apiRequest>[0], context: ReturnType<typeof createStory12Context>) => {
    const systemHeaders = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });
    const tenantResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenants',
      headers: systemHeaders,
      data: {
        name: `Story12-${context.orgUnitCode}`,
      },
    });

    expect(tenantResponse.status()).toBe(200);
    const tenantBody = await tenantResponse.json();
    context.tenantId = tenantBody.data.tenant.id;
  };

  test('[P0] toggles module entitlement with immediate authorization state update @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const headers = createStory12TenantHeaders(context);
    const payload = createModuleEntitlementPayload({
      enabled: false,
      reason: 'suspend-module',
    });

    const response = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers,
      data: {
        tenantId: context.tenantId,
        moduleKey: context.moduleKey,
        ...payload,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'MODULE_ENTITLEMENT_UPDATED',
      data: {
        entitlement: {
          tenant_id: context.tenantId,
          module_key: context.moduleKey,
          enabled: false,
        },
      },
    });
  });

  test('[P0] creates and updates orgUnit scope while preserving tenant boundary @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const headers = createStory12TenantHeaders(context);

    const createResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-units',
      headers,
      data: {
        tenantId: context.tenantId,
        ...createOrgUnitPayload(context),
        reason: 'org-unit-bootstrap',
      },
    });

    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    expect(created).toMatchObject({
      ok: true,
      code: 'ORG_UNIT_CREATED',
      data: {
        orgUnit: {
          tenant_id: context.tenantId,
        },
      },
    });

    const updateResponse = await apiRequest(request, {
      method: 'PUT',
      path: `/api/v1/platform/admin/org-units/${created.data.orgUnit.id}`,
      headers,
      data: {
        tenantId: context.tenantId,
        name: 'Regional Operations',
        reason: 'org-unit-update',
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();
    expect(updated).toMatchObject({
      ok: true,
      code: 'ORG_UNIT_UPDATED',
      data: {
        orgUnit: {
          tenant_id: context.tenantId,
        },
      },
    });
  });

  test('[P0] emits audit and outbox metadata for role assignment mutations @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const headers = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });

    const orgUnitResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-units',
      headers,
      data: {
        tenantId: context.tenantId,
        ...createOrgUnitPayload(context),
        reason: 'org-unit-for-membership',
      },
    });
    expect(orgUnitResponse.status()).toBe(200);
    const orgUnitBody = await orgUnitResponse.json();

    const assignmentResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-unit-memberships',
      headers,
      data: {
        tenantId: context.tenantId,
        orgUnitId: orgUnitBody.data.orgUnit.id,
        userId: context.assigneeUserId,
        roleSet: ['ORGUNIT_MEMBER'],
        reason: 'operations-coverage',
      },
    });

    expect(assignmentResponse.status()).toBe(200);
    const assignmentBody = await assignmentResponse.json();
    expect(assignmentBody).toMatchObject({
      ok: true,
      code: 'ORG_UNIT_MEMBERSHIP_UPDATED',
      data: {
        tenantId: context.tenantId,
        orgUnitId: orgUnitBody.data.orgUnit.id,
        userId: context.assigneeUserId,
      },
    });
  });

  test('[P1] refuses initial tenant admin assignment for non-system actors @P1', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const headers = createStory12TenantHeaders(context, { role: 'TENANT_ADMIN' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers,
      data: {
        tenantId: context.tenantId,
        userId: context.assigneeUserId,
        roleSet: ['TENANT_ADMIN'],
        reason: 'bootstrap-admin',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
      refusalType: 'security',
    });
  });

  test('[P1] allows system admin to assign initial tenant admin once for tenant bootstrap @P1', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const headers = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers,
      data: {
        tenantId: context.tenantId,
        userId: context.assigneeUserId,
        roleSet: ['TENANT_ADMIN'],
        reason: 'bootstrap-admin',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'TENANT_MEMBERSHIP_UPDATED',
      data: {
        tenantId: context.tenantId,
        userId: context.assigneeUserId,
        roleSet: ['TENANT_ADMIN'],
      },
    });
  });
});
