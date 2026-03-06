import { test, expect } from '@playwright/test';

test.describe(
  'Story a.4 Escalation Baseline and Recipient Configuration (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] orgUnit admin saves valid escalation baseline and recipients from settings screen @P0',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
        );

        await expect(
          page.getByRole('heading', {
            name: 'ConnectShyft Escalation Settings',
          }),
        ).toBeVisible();

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('6');
        await page.getByTestId('connectshyft-escalation-recipient-primary').selectOption(
          'user-connectshyft-a4-primary-recipient',
        );
        await page.getByTestId('connectshyft-escalation-recipient-secondary').selectOption(
          'user-connectshyft-a4-secondary-recipient',
        );
        await page.getByTestId('connectshyft-escalation-recipient-tenant-staff').selectOption(
          'user-connectshyft-a4-tenant-staff-recipient',
        );

        const saveResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/escalation/config')
            && response.request().method() === 'PUT',
        );
        await page.getByRole('button', { name: 'Save Escalation Settings' }).click();
        await saveResponse;

        await expect(page.getByTestId('connectshyft-escalation-save-success')).toContainText(
          'Escalation settings saved',
        );
        await expect(page.getByTestId('connectshyft-escalation-baseline-display')).toHaveText('6 hours');
      },
    );

    test.skip(
      '[P0] invalid baseline values are blocked with deterministic validation feedback and no save confirmation @P0',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
        );

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('25');
        await page.getByTestId('connectshyft-escalation-recipient-primary').selectOption(
          'user-connectshyft-a4-primary-recipient',
        );
        await page.getByRole('button', { name: 'Save Escalation Settings' }).click();

        await expect(page.getByTestId('connectshyft-escalation-validation-error')).toContainText(
          'Use whole hours between 1 and 24',
        );
        await expect(page.getByTestId('connectshyft-escalation-save-success')).toHaveCount(0);
      },
    );

    test.skip(
      '[P1] missing required primary recipient shows deterministic refusal state and blocks persistence @P1',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
        );

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('4');
        await page.getByTestId('connectshyft-escalation-recipient-primary').selectOption('');
        await page.getByTestId('connectshyft-escalation-recipient-secondary').selectOption(
          'user-connectshyft-a4-secondary-recipient',
        );
        await page.getByRole('button', { name: 'Save Escalation Settings' }).click();

        await expect(page.getByTestId('connectshyft-escalation-recipient-error-primary')).toContainText(
          'Primary recipient is required',
        );
        await expect(page.getByTestId('connectshyft-escalation-save-success')).toHaveCount(0);
      },
    );
  },
);
