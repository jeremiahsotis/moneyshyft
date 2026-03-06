import { test, expect } from '@playwright/test';

test.describe('Story 1.2 Tenant and Module Entitlement Administration (ATDD E2E RED)', () => {
  test.skip('[P0] tenant admin toggles module and authorization updates immediately @P0', async ({ page }) => {
    await page.goto('/app/tenant/settings/modules');

    await page.getByTestId('module-row-payroll').getByTestId('module-enabled-toggle').click();
    await expect(page.getByTestId('module-change-toast')).toHaveText('Module entitlement updated');

    await page.goto('/app/payroll');
    await expect(page.getByText('Access denied for module')).toBeVisible();
  });

  test.skip('[P1] non-system actor is refused for initial tenant admin assignment @P1', async ({ page }) => {
    await page.goto('/app/tenant/settings/admins');

    await page.getByTestId('initial-admin-user-id-input').fill('user-234');
    await page.getByTestId('assign-initial-tenant-admin-button').click();

    await expect(page.getByTestId('business-refusal-banner')).toContainText('SYSTEM_ADMIN role is required');
    await expect(page.getByTestId('business-refusal-code')).toHaveText('INITIAL_TENANT_ADMIN_REQUIRES_SYSTEM_ADMIN');
  });
});
