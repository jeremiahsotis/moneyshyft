import { test, expect } from '@playwright/test';

test.describe(
  'Story a.3 OrgUnit Number Mapping Management (ATDD E2E RED)',
  () => {
    test.skip(
      '[P0] orgUnit admin can add multiple valid E.164 mappings and sees deterministic table state after each save @P0',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
        );

        await expect(
          page.getByRole('heading', {
            name: 'ConnectShyft Numbers & OrgUnit Config',
          }),
        ).toBeVisible();

        await page.getByTestId('connectshyft-number-input').fill('+12605550111');
        await page.getByTestId('connectshyft-number-label-input').fill('Primary Dispatch');
        const firstSaveResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers')
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await firstSaveResponse;

        await page.getByTestId('connectshyft-number-input').fill('+12605550112');
        await page.getByTestId('connectshyft-number-label-input').fill('Overflow Dispatch');
        const secondSaveResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers')
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await secondSaveResponse;

        await expect(
          page.getByTestId('connectshyft-number-mapping-row').filter({
            hasText: '+12605550111',
          }),
        ).toBeVisible();
        await expect(
          page.getByTestId('connectshyft-number-mapping-row').filter({
            hasText: '+12605550112',
          }),
        ).toBeVisible();
      },
    );

    test.skip(
      '[P0] duplicate tenant number entry shows actionable validation feedback and blocks persistence @P0',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-west&tenantRole=ORGUNIT_ADMIN',
        );

        await page.getByTestId('connectshyft-number-input').fill('+12605550123');
        await page.getByTestId('connectshyft-number-label-input').fill('Duplicate Candidate');
        const duplicateResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers')
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await duplicateResponse;

        await expect(
          page.getByTestId('connectshyft-number-validation-error'),
        ).toContainText('already mapped in this tenant');
        await expect(
          page.getByTestId('connectshyft-number-mapping-row').filter({
            hasText: '+12605550123',
          }),
        ).toHaveCount(1);
      },
    );

    test.skip(
      '[P1] invalid non-E.164 input is rejected inline and preserves deterministic form and table state @P1',
      async ({ page }) => {
        await page.goto(
          '/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
        );

        await page.getByTestId('connectshyft-number-input').fill('260-555-0111');
        await page.getByTestId('connectshyft-number-label-input').fill('Invalid Mapping');
        const invalidResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers')
            && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await invalidResponse;

        await expect(
          page.getByTestId('connectshyft-number-validation-error'),
        ).toContainText('Use a valid Twilio E.164 number');
        await expect(
          page.getByTestId('connectshyft-number-mapping-row').filter({
            hasText: 'Invalid Mapping',
          }),
        ).toHaveCount(0);
      },
    );
  },
);
