import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { generateAccessToken, type JWTPayload } from '../../../src/src/utils/jwt';

type SignedUpUser = {
  userId: string;
  email: string;
  householdId: string | null;
};

const resolveBaseUrl = (): string => process.env.BASE_URL || 'http://localhost:5174';

const signupTenantAdminUser = async (page: Page): Promise<SignedUpUser> => {
  const suffix = randomUUID().slice(0, 8);
  const email = `story12-admin-ui-${suffix}@example.com`;
  const response = await page.request.post('/api/v1/auth/signup', {
    data: {
      firstName: 'Admin',
      lastName: 'Tester',
      email,
      password: 'Password123!',
      householdName: `Story12-UI-${suffix}`,
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  const userId =
    body?.user?.id
    || body?.user?.userId
    || body?.data?.user?.id
    || body?.data?.user?.userId;
  const householdId =
    body?.user?.householdId
    || body?.data?.user?.householdId
    || null;
  expect(typeof userId).toBe('string');

  return {
    userId: userId as string,
    email,
    householdId: typeof householdId === 'string' ? householdId : null,
  };
};

const assumeSystemAdminSession = async (page: Page, user: SignedUpUser): Promise<void> => {
  const baseUrl = resolveBaseUrl();
  const csrfToken = `csrf-${randomUUID()}`;
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    householdId: user.householdId,
    activeTenantId: user.householdId,
    activeOrgUnitId: null,
    role: 'SYSTEM_ADMIN',
  };
  const accessToken = generateAccessToken(payload);

  await page.context().addCookies([
    {
      name: 'access_token',
      value: accessToken,
      url: baseUrl,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'csrf_token',
      value: csrfToken,
      url: baseUrl,
      path: '/',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);
};

test.describe('Story 1.2 admin provisioning UI - role-gated journeys', () => {
  test('[P0] tenant admin can access tenant administration view with breadcrumbs @P0', async ({ page }) => {
    await signupTenantAdminUser(page);

    await page.goto('/admin/tenant');

    await expect(page.getByTestId('tenant-admin-heading')).toBeVisible();
    await expect(page.getByTestId('admin-breadcrumbs')).toContainText('Dashboard');
    await expect(page.getByTestId('admin-breadcrumbs')).toContainText('Tenant Admin');
  });

  test('[P1] tenant admin is denied direct access to system administration view @P1', async ({ page }) => {
    await signupTenantAdminUser(page);

    await page.goto('/admin/system');

    await expect(page).toHaveURL(/\/admin\/tenant$/);
    await expect(page.getByTestId('tenant-admin-heading')).toBeVisible();
  });

  test('[P1] tenant admin can create an orgUnit from tenant administration form @P1', async ({ page }) => {
    await signupTenantAdminUser(page);

    await page.goto('/admin/tenant');

    const unique = randomUUID().slice(0, 8);
    await page.getByTestId('org-unit-name-input').fill(`Operations ${unique}`);
    await page.getByTestId('org-unit-reason-input').fill('story12-admin-ui-test');
    await page.getByTestId('org-unit-submit').click();

    await expect(page.getByTestId('admin-form-success')).toContainText('OrgUnit created');
  });

  test('[P0] system admin can bootstrap a tenant with inline admin identity (email-as-username) @P0', async ({ page }) => {
    const systemUser = await signupTenantAdminUser(page);
    await assumeSystemAdminSession(page, systemUser);

    await page.goto('/admin/system');
    await expect(page.getByTestId('system-admin-heading')).toBeVisible();

    const suffix = randomUUID().slice(0, 8);
    await page.getByTestId('tenant-name-input').fill(`Story12 Inline ${suffix}`);
    await page.getByTestId('tenant-admin-user-email-input').fill(`inline-bootstrap-${suffix}@example.com`);
    await page.getByTestId('tenant-admin-first-name-input').fill('Inline');
    await page.getByTestId('tenant-admin-last-name-input').fill('Bootstrap');
    await page.getByTestId('tenant-reason-input').fill('story12-system-admin-inline-bootstrap');
    await page.getByTestId('tenant-submit').click();

    await expect(page.getByTestId('admin-form-success')).toContainText('Tenant created:');
    await expect(page.getByTestId('admin-form-error')).toHaveCount(0);
  });

  test('[P1] tenant admin assignment flow refuses out-of-scope UUID identity inputs @P1', async ({ page }) => {
    await signupTenantAdminUser(page);
    const outOfScopeUser = await signupTenantAdminUser(page);

    await page.goto('/admin/tenant');
    await expect(page.getByTestId('tenant-admin-heading')).toBeVisible();

    await page.locator('#tenant-role-user-id').fill(outOfScopeUser.userId);
    await page.locator('#tenant-role-reason').fill('story12-ui-out-of-scope-identity');
    await page.getByRole('button', { name: 'Assign Tenant Role' }).click();

    await expect(page.getByTestId('admin-form-error')).toContainText('active tenant scope');
  });
});
