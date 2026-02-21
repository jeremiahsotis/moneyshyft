import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const signupTenantAdminUser = async (page: Page) => {
  const suffix = randomUUID().slice(0, 8);
  const response = await page.request.post('/api/v1/auth/signup', {
    data: {
      firstName: 'Admin',
      lastName: 'Tester',
      email: `story12-admin-ui-${suffix}@example.com`,
      password: 'Password123!',
      householdName: `Story12-UI-${suffix}`,
    },
  });

  expect(response.status()).toBe(201);
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
});
