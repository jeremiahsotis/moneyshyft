import { test, expect } from '@playwright/test';

test.describe('Story 1.1 Tenant Context Resolution and Isolation Guardrails (ATDD E2E RED)', () => {
  test.skip('[P0] orgUnit-scoped screens refuse access outside active tenant context @P0', async ({ page }) => {
    await page.goto('/app/orgunit/workspace?orgUnitId=spoofed');
    await expect(page.getByText('Access denied for selected org unit')).toBeVisible();
  });

  test.skip('[P1] tenant context banner reflects canonical context and scope mode @P1', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByTestId('tenant-context-banner')).toBeVisible();
    await expect(page.getByTestId('tenant-context-scope-mode')).toHaveText(/TENANT|ORGUNIT/);
  });
});
