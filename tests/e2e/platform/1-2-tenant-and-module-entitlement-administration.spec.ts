import { apiRequest } from '../../support/helpers/apiClient';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  createModuleEntitlementPayload,
  createOrgUnitPayload,
  createStory12TenantHeaders,
} from '../../support/factories/tenantEntitlementFactory';
import { test, expect } from '../../support/fixtures/tenantEntitlementStory12.fixture';

test.describe('Story 1.2 automate - tenant and module entitlement administration journey', () => {
  const signupTenantAdminUiUser = async (page: Page, label: string): Promise<{ userId: string; email: string }> => {
    const email = `story12-ui-${label}-${randomUUID()}@example.com`;
    const signupResponse = await page.request.post('/api/v1/auth/signup', {
      data: {
        email,
        password: 'Password123!',
        firstName: 'Story',
        lastName: 'UI',
        householdName: `Story12-UI-${label}`,
      },
    });

    expect(signupResponse.status()).toBe(201);
    const body = await signupResponse.json();
    const userId =
      body?.user?.id
      || body?.user?.userId
      || body?.data?.user?.id
      || body?.data?.user?.userId;
    expect(typeof userId).toBe('string');

    return {
      userId: userId as string,
      email,
    };
  };

  const bootstrapAssigneeUser = async (
    request: Parameters<typeof apiRequest>[0],
    story12Context: {
      assigneeUserId: string;
      actorUserId: string;
      orgUnitCode: string;
    },
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
        householdName: `Story12-${story12Context.orgUnitCode}`,
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
    story12Context.assigneeUserId = userId;
    story12Context.actorUserId = userId;
  };

  const bootstrapTenant = async (request: Parameters<typeof apiRequest>[0], story12Context: {
    tenantId: string;
    actorUserId: string;
    orgUnitCode: string;
  }) => {
    const systemHeaders = createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' });
    const tenantResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenants',
      headers: systemHeaders,
      data: {
        name: `Story12-${story12Context.orgUnitCode}`,
      },
    });

    expect(tenantResponse.status()).toBe(200);
    const tenantBody = await tenantResponse.json();
    story12Context.tenantId = tenantBody.data.tenant.id;
  };

  test('[P0] applies module disable and blocks protected module scope in the same journey @P0', async ({
    request,
    story12Context,
  }) => {
    await bootstrapAssigneeUser(request, story12Context);
    await bootstrapTenant(request, story12Context);
    const tenantAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'TENANT_ADMIN' });
    const systemAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' });

    const disableResponse = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        moduleKey: story12Context.moduleKey,
        ...createModuleEntitlementPayload({
          enabled: false,
          reason: 'suspend-module',
        }),
      },
    });

    expect(disableResponse.status()).toBe(200);
    const disabledBody = await disableResponse.json();
    expect(disabledBody).toMatchObject({
      ok: true,
      code: 'MODULE_ENTITLEMENT_UPDATED',
      data: {
        entitlement: {
          tenant_id: story12Context.tenantId,
          module_key: story12Context.moduleKey,
          enabled: false,
        },
      },
    });

    const reenableResponse = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        moduleKey: story12Context.moduleKey,
        ...createModuleEntitlementPayload({
          enabled: true,
          reason: 'reactivate-module',
        }),
      },
    });

    expect(reenableResponse.status()).toBe(403);
    const boundedReenableBody = await reenableResponse.json();
    expect(boundedReenableBody).toMatchObject({
      ok: false,
      code: 'MODULE_ASSIGNMENT_OUT_OF_BOUNDS',
      refusalType: 'security',
    });

    const systemReenableResponse = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: systemAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        moduleKey: story12Context.moduleKey,
        ...createModuleEntitlementPayload({
          enabled: true,
          reason: 'system-reactivate-module',
        }),
      },
    });

    expect(systemReenableResponse.status()).toBe(200);
    const systemReenabledBody = await systemReenableResponse.json();
    expect(systemReenabledBody).toMatchObject({
      ok: true,
      data: {
        entitlement: {
          enabled: true,
        },
      },
    });
  });

  test('[P0] preserves orgUnit-scoped authorization immediately after role assignment changes @P0', async ({
    request,
    story12Context,
  }) => {
    await bootstrapAssigneeUser(request, story12Context);
    await bootstrapTenant(request, story12Context);
    const tenantAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' });

    const orgUnitResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-units',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        ...createOrgUnitPayload(story12Context),
        reason: 'org-unit-bootstrap',
      },
    });

    expect(orgUnitResponse.status()).toBe(200);
    const orgUnitBody = await orgUnitResponse.json();

    const assignmentResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/org-unit-memberships',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        orgUnitId: orgUnitBody.data.orgUnit.id,
        userId: story12Context.assigneeUserId,
        roleSet: ['ORGUNIT_MEMBER'],
        reason: 'operations-coverage',
      },
    });

    expect(assignmentResponse.status()).toBe(200);
    const assignmentBody = await assignmentResponse.json();
    expect(assignmentBody).toMatchObject({
      ok: true,
      data: {
        tenantId: story12Context.tenantId,
        orgUnitId: orgUnitBody.data.orgUnit.id,
        userId: story12Context.assigneeUserId,
      },
    });
  });

  test('[P1] keeps outbox/audit metadata deterministic across entitlement and role mutations @P1', async ({
    request,
    story12Context,
  }) => {
    await bootstrapAssigneeUser(request, story12Context);
    await bootstrapTenant(request, story12Context);
    const tenantAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'TENANT_ADMIN' });
    const systemAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' });

    const entitlementResponse = await apiRequest(request, {
      method: 'PUT',
      path: '/api/v1/platform/admin/module-entitlements',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        moduleKey: story12Context.moduleKey,
        ...createModuleEntitlementPayload({ enabled: false, reason: 'suspend-module' }),
      },
    });

    expect(entitlementResponse.status()).toBe(200);
    const entitlementBody = await entitlementResponse.json();

    const roleMutationResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers: systemAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        userId: story12Context.assigneeUserId,
        roleSet: ['TENANT_STAFF'],
        reason: 'role-adjustment',
      },
    });

    expect(roleMutationResponse.status()).toBe(200);
    const roleBody = await roleMutationResponse.json();

    expect(entitlementBody.data.entitlement.tenant_id).toBe(story12Context.tenantId);
    expect(roleBody.data.tenantId).toBe(story12Context.tenantId);
    expect(entitlementBody.data.entitlement.enabled).toBe(false);
    expect(roleBody.data.roleSet).toEqual(['TENANT_STAFF']);
  });

  test('[P1] enforces system-admin-only bootstrap in journey sequence @P1', async ({
    request,
    story12Context,
  }) => {
    await bootstrapAssigneeUser(request, story12Context);
    await bootstrapTenant(request, story12Context);
    const tenantAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'TENANT_ADMIN' });
    const systemAdminHeaders = createStory12TenantHeaders(story12Context, { role: 'SYSTEM_ADMIN' });

    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers: tenantAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        userId: story12Context.assigneeUserId,
        roleSet: ['TENANT_ADMIN'],
        reason: 'bootstrap-admin',
      },
    });

    expect(refusalResponse.status()).toBe(403);
    const refusalBody = await refusalResponse.json();
    expect(refusalBody).toMatchObject({
      ok: false,
      code: 'FORBIDDEN',
      refusalType: 'security',
    });

    const grantResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/admin/tenant-memberships',
      headers: systemAdminHeaders,
      data: {
        tenantId: story12Context.tenantId,
        userId: story12Context.assigneeUserId,
        roleSet: ['TENANT_ADMIN'],
        reason: 'bootstrap-admin',
      },
    });

    expect(grantResponse.status()).toBe(200);
    const grantBody = await grantResponse.json();
    expect(grantBody).toMatchObject({
      ok: true,
      code: 'TENANT_MEMBERSHIP_UPDATED',
      data: {
        tenantId: story12Context.tenantId,
        roleSet: ['TENANT_ADMIN'],
      },
    });
  });

  test('[P1] tenant-admin people flow accepts non-UUID email identity in-scope @P1', async ({ page }) => {
    const currentUser = await signupTenantAdminUiUser(page, 'email-assignment');
    const suffix = randomUUID().slice(0, 8);
    const inviteEmail = `story12-invite-${suffix}@example.com`;

    await page.goto('/admin/tenant');
    await expect(page.getByTestId('tenant-admin-heading')).toBeVisible();

    await page.getByRole('button', { name: /People/ }).first().click();
    await page.getByRole('button', { name: '+ Add Person' }).click();
    await page.locator('#create-person-first').fill('Email');
    await page.locator('#create-person-last').fill('Assignee');
    await page.locator('#create-person-email').fill(inviteEmail);
    await page.locator('#create-person-temp-password').fill('SecurePass123!');
    const createPersonResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'POST'
      && response.url().includes('/api/v1/platform/admin/people'),
    );
    await page.getByRole('button', { name: 'Add Person' }).last().click();

    const createPersonResponse = await createPersonResponsePromise;
    expect(createPersonResponse.status()).toBe(200);
    const createPersonBody = await createPersonResponse.json();
    expect(createPersonBody).toMatchObject({
      ok: true,
      code: 'TENANT_PERSON_CREATED',
      data: {
        user: {
          email: inviteEmail.toLowerCase(),
        },
      },
    });

    const meResponse = await page.request.get('/api/v1/auth/me');
    expect(meResponse.status()).toBe(200);
    const meBody = await meResponse.json();
    const meUserId =
      meBody?.user?.id
      || meBody?.data?.user?.id
      || null;
    expect(meUserId).toBe(currentUser.userId);
  });

  test('[P1] moneyshyft-governed nav and direct URLs are blocked when entitlement is missing @P1', async ({ page }) => {
    await signupTenantAdminUiUser(page, 'moneyshyft-deny');

    await page.goto('/admin/tenant');
    await expect(page.getByTestId('tenant-admin-heading')).toBeVisible();

    await expect(page.getByRole('link', { name: /^Accounts$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Transactions$/i })).toHaveCount(0);
    await expect(page.getByTestId('tenant-grant-moneyshyft')).toHaveCount(0);
    await expect(page.getByTestId('tenant-grant-connectshyft')).toHaveCount(0);

    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/admin\/tenant$/);

    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/admin\/tenant$/);
  });
});
