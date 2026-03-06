import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createOrgUnitPayload,
  createStory12Context,
  createStory12TenantHeaders,
} from '../../support/factories/tenantEntitlementFactory';

test.describe('Story 1.2 admin provisioning UI - RBAC matrix API coverage', () => {
  const bootstrapUser = async (
    request: Parameters<typeof apiRequest>[0],
    context: ReturnType<typeof createStory12Context>,
  ) => {
    const email = `story12-admin-rbac-${randomUUID()}@example.com`;
    const signupResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/signup',
      data: {
        email,
        password: 'Password123!',
        firstName: 'Story',
        lastName: 'Admin',
        householdName: `Story12-Admin-${context.orgUnitCode}`,
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

    context.actorUserId = userId;
    context.assigneeUserId = userId;
  };

  const bootstrapTenant = async (
    request: Parameters<typeof apiRequest>[0],
    context: ReturnType<typeof createStory12Context>,
  ) => {
    const systemHeaders = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });
    const tenantResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenants',
      headers: systemHeaders,
      data: {
        name: `Story12-Admin-${context.orgUnitCode}`,
      },
    });

    expect(tenantResponse.status()).toBe(200);
    const tenantBody = await tenantResponse.json();
    context.tenantId = tenantBody.data.tenant.id;
  };

  const evaluate = async (
    request: Parameters<typeof apiRequest>[0],
    context: ReturnType<typeof createStory12Context>,
    role: string,
  ) => {
    const headers = createStory12TenantHeaders(context, { role });
    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/admin/rbac/evaluate?tenantId=${context.tenantId}`,
      headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'RBAC_EVALUATED',
    });

    return body.data as {
      roles: string[];
      capabilities: string[];
    };
  };

  test('[P0] system admin role resolves platform-wide provisioning capabilities @P0', async ({ request }) => {
    const context = createStory12Context();
    await bootstrapUser(request, context);
    await bootstrapTenant(request, context);

    const data = await evaluate(request, context, 'SYSTEM_ADMIN');

    expect(data.capabilities).toContain('platform:tenant:create');
    expect(data.capabilities).toContain('platform:tenant_admin:assign');
    expect(data.capabilities).toContain('tenant:org_unit:create');
  });

  test('[P0] tenant admin role cannot resolve tenant-create capability but keeps tenant governance capabilities @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapUser(request, context);
    await bootstrapTenant(request, context);

    const data = await evaluate(request, context, 'TENANT_ADMIN');

    expect(data.capabilities).not.toContain('platform:tenant:create');
    expect(data.capabilities).toContain('tenant:org_unit:create');
    expect(data.capabilities).toContain('tenant:role:assign');
  });

  test('[P1] tenant staff role is denied orgUnit creation mutation contracts @P1', async ({ request }) => {
    const context = createStory12Context();
    await bootstrapUser(request, context);
    await bootstrapTenant(request, context);

    const staffHeaders = createStory12TenantHeaders(context, { role: 'TENANT_STAFF' });
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-units',
      headers: staffHeaders,
      data: {
        tenantId: context.tenantId,
        ...createOrgUnitPayload(context),
        reason: 'tenant-staff-should-be-denied',
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

  test('[P1] tenant viewer role resolves read-focused capability envelope only @P1', async ({ request }) => {
    const context = createStory12Context();
    await bootstrapUser(request, context);
    await bootstrapTenant(request, context);

    const data = await evaluate(request, context, 'TENANT_VIEWER');

    expect(data.capabilities).toContain('tenant:read_all');
    expect(data.capabilities).toContain('tenant:thread:view_all');
    expect(data.capabilities).not.toContain('tenant:org_unit:create');
  });
});
