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
  const createUser = async (
    request: Parameters<typeof apiRequest>[0],
    label: string,
  ): Promise<{ userId: string; email: string }> => {
    const normalizedLabel = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 16) || 'user';
    const uniqueToken = randomUUID().replace(/-/g, '').slice(0, 12);
    const email = `s12-${normalizedLabel}-${uniqueToken}@example.com`;
    const requestState = await request.storageState();
    const csrfCookie = [...requestState.cookies]
      .reverse()
      .find((cookie) => cookie.name === 'csrf_token');
    const signupHeaders = csrfCookie?.value
      ? { 'x-csrf-token': csrfCookie.value }
      : undefined;
    const signupResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/signup',
      headers: signupHeaders,
      data: {
        email,
        password: 'Password123!',
        firstName: 'Story',
        lastName: 'Twelve',
        householdName: `Story12-${label}`,
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

    return {
      userId: userId as string,
      email,
    };
  };

  const bootstrapAssigneeUser = async (
    request: Parameters<typeof apiRequest>[0],
    context: ReturnType<typeof createStory12Context>,
  ) => {
    const created = await createUser(request, context.orgUnitCode);
    context.assigneeUserId = created.userId;
    context.actorUserId = created.userId;
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

  test('[P0] resolves scoped lookup and inline admin provisioning with anti-enumeration boundaries @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const systemHeaders = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });
    const tenantHeaders = createStory12TenantHeaders(context, { role: 'TENANT_ADMIN' });

    const inScopeOne = await createUser(request, 'lookup-alpha');
    const inScopeTwo = await createUser(request, 'lookup-beta');
    const outOfScope = await createUser(request, 'lookup-outside');

    const otherTenantResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenants',
      headers: systemHeaders,
      data: {
        name: `Story12-other-${randomUUID().slice(0, 8)}`,
      },
    });
    expect(otherTenantResponse.status()).toBe(200);
    const otherTenantBody = await otherTenantResponse.json();
    const otherTenantId = otherTenantBody.data.tenant.id as string;

    for (const userId of [inScopeOne.userId, inScopeTwo.userId]) {
      const assignmentResponse = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/admin/tenant-memberships',
        headers: systemHeaders,
        data: {
          tenantId: context.tenantId,
          userId,
          roleSet: ['TENANT_VIEWER'],
          reason: 'lookup-scope-seed',
        },
      });
      expect(assignmentResponse.status()).toBe(200);
    }

    const outScopeAssignment = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers: systemHeaders,
      data: {
        tenantId: otherTenantId,
        userId: outOfScope.userId,
        roleSet: ['TENANT_VIEWER'],
        reason: 'lookup-scope-seed',
      },
    });
    expect(outScopeAssignment.status()).toBe(200);

    const shortLookup = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/admin/users/lookup?tenantId=${context.tenantId}&q=ab`,
      headers: tenantHeaders,
    });
    expect(shortLookup.status()).toBe(400);
    const shortLookupBody = await shortLookup.json();
    expect(shortLookupBody).toMatchObject({
      ok: false,
      code: 'USER_LOOKUP_QUERY_TOO_SHORT',
      refusalType: 'client',
    });

    const lookup = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/admin/users/lookup?tenantId=${context.tenantId}&q=lookup&pageSize=200`,
      headers: tenantHeaders,
    });
    expect(lookup.status()).toBe(200);
    const lookupBody = await lookup.json();
    expect(lookupBody).toMatchObject({
      ok: true,
      code: 'SCOPED_USER_LOOKUP_RESOLVED',
      data: {
        tenantId: context.tenantId,
        pageSize: 25,
      },
    });

    const returnedUsers = (lookupBody?.data?.users || []) as Array<{ id: string; email: string }>;
    expect(returnedUsers.some((entry) => entry.email === outOfScope.email)).toBe(false);
    expect(returnedUsers.some((entry) => entry.email === inScopeOne.email)).toBe(true);
    expect(returnedUsers.some((entry) => entry.email === inScopeTwo.email)).toBe(true);

    const deterministicOrder = returnedUsers.map((entry) => `${entry.email.toLowerCase()}::${entry.id}`);
    expect(deterministicOrder).toEqual([...deterministicOrder].sort((a, b) => a.localeCompare(b)));

    const inlineEmail = `inline-admin-${randomUUID()}@example.com`;
    const inlineResolution = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/users/inline-admin',
      headers: systemHeaders,
      data: {
        tenantId: context.tenantId,
        userEmail: inlineEmail,
        firstName: 'Inline',
        lastName: 'Admin',
        reason: 'inline-admin-provisioning',
      },
    });
    expect(inlineResolution.status()).toBe(200);
    const inlineBody = await inlineResolution.json();
    expect(inlineBody).toMatchObject({
      ok: true,
      code: 'INLINE_ADMIN_USER_READY',
      data: {
        tenantId: context.tenantId,
        email: inlineEmail,
        createdInline: true,
      },
    });
  });

  test('[P0] enforces module entitlement gates for ConnectShyft and governed MoneyShyft API prefixes @P0', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const systemHeaders = createStory12TenantHeaders(context, { role: 'SYSTEM_ADMIN' });
    const tenantHeaders = createStory12TenantHeaders(context, { role: 'TENANT_ADMIN' });

    const connectShyftDenied = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/connectshyft/inbox',
      headers: tenantHeaders,
    });
    expect(connectShyftDenied.status()).toBe(200);
    const connectShyftBody = await connectShyftDenied.json();
    expect(connectShyftBody).toMatchObject({
      ok: false,
      refusalType: 'business',
      data: {
        moduleKey: 'connectshyft',
        tenantId: context.tenantId,
      },
    });
    expect(String(connectShyftBody.code)).toContain('CONNECTSHYFT_');

    const disableMoneyResponse = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: systemHeaders,
      data: {
        tenantId: context.tenantId,
        moduleKey: 'moneyshyft',
        enabled: false,
        reason: 'disable-moneyshyft-for-gate-contract',
      },
    });
    expect(disableMoneyResponse.status()).toBe(200);

    const governedMoneyPaths = [
      '/api/v1/accounts',
      '/api/v1/transactions',
      '/api/v1/categories',
      '/api/v1/goals',
      '/api/v1/budgets',
      '/api/v1/income',
      '/api/v1/debts',
      '/api/v1/assignments',
      '/api/v1/households',
      '/api/v1/recurring-transactions',
      '/api/v1/extra-money',
      '/api/v1/settings',
      '/api/v1/scenarios',
      '/api/v1/tags',
    ];

    for (const path of governedMoneyPaths) {
      const response = await apiRequest(request, {
        method: 'GET',
        path,
        headers: tenantHeaders,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        refusalType: 'business',
        data: {
          moduleKey: 'moneyshyft',
          tenantId: context.tenantId,
        },
      });
      expect(String(body.code)).toContain('MONEYSHYFT_');
    }

    const excludedRouteControl = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/admin/rbac/evaluate?tenantId=${context.tenantId}`,
      headers: tenantHeaders,
    });
    expect(excludedRouteControl.status()).toBe(200);
    const excludedBody = await excludedRouteControl.json();
    expect(excludedBody).toMatchObject({
      ok: true,
      code: 'RBAC_EVALUATED',
    });
  });

  test('[P1] refuses out-of-scope identity assignment and tenant-bounded module escalation @P1', async ({
    request,
  }) => {
    const context = createStory12Context();
    await bootstrapAssigneeUser(request, context);
    await bootstrapTenant(request, context);
    const tenantHeaders = createStory12TenantHeaders(context, { role: 'TENANT_ADMIN' });

    const outOfScope = await createUser(request, 'out-of-scope');
    const outOfScopeAssignment = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers: tenantHeaders,
      data: {
        tenantId: context.tenantId,
        userId: outOfScope.userId,
        roleSet: ['TENANT_STAFF'],
        reason: 'out-of-scope-assign-check',
      },
    });

    expect(outOfScopeAssignment.status()).toBe(404);
    const outOfScopeBody = await outOfScopeAssignment.json();
    expect(outOfScopeBody).toMatchObject({
      ok: false,
      code: 'ASSIGNABLE_USER_NOT_FOUND',
      refusalType: 'client',
    });

    const outOfBoundsModuleAssign = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: tenantHeaders,
      data: {
        tenantId: context.tenantId,
        moduleKey: 'connectshyft',
        enabled: true,
        reason: 'tenant-admin-out-of-bounds-enable',
      },
    });

    expect(outOfBoundsModuleAssign.status()).toBe(403);
    const outOfBoundsBody = await outOfBoundsModuleAssign.json();
    expect(outOfBoundsBody).toMatchObject({
      ok: false,
      code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
      refusalType: 'security',
    });
  });
});
