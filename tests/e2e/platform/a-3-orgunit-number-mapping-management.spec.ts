import { test, expect } from '../../support/fixtures/connectShyftStoryA3.fixture';
import type { Page } from '@playwright/test';
import { login } from '../../helpers/auth';

const buildNumbersUrl = (query: string): string =>
  `/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&${query}`;

const saveNumberMapping = async (
  page: Page,
  twilioNumberE164: string,
  label: string,
): Promise<void> => {
  await page.getByTestId('connectshyft-number-input').fill(twilioNumberE164);
  await page.getByTestId('connectshyft-number-label-input').fill(label);
  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/connectshyft/numbers')
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Number Mapping' }).click();
  await saveResponse;
};

test.describe(
  'Story a.3 automate - orgUnit number mapping management operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] orgUnit admins can add multiple valid mappings and see deterministic table state after each save @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNumbersUrl(
            'tenantId=tenant-connectshyft-alpha-a3m1&orgUnitId=org-connectshyft-alpha-a3m1-east&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await expect(
          page.getByRole('heading', {
            name: 'ConnectShyft Numbers & OrgUnit Config',
          }),
        ).toBeVisible();

        await saveNumberMapping(page, '+12605550212', 'Overflow Dispatch');
        await saveNumberMapping(page, '+12605550211', 'Primary Dispatch');

        const rows = page.getByTestId('connectshyft-number-mapping-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText('+12605550211');
        await expect(rows.nth(1)).toContainText('+12605550212');
      },
    );

    test(
      '[P0] duplicate tenant numbers show actionable refusal copy and do not create an extra mapping row @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNumbersUrl(
            'tenantId=tenant-connectshyft-alpha-a3m2&orgUnitId=org-connectshyft-alpha-a3m2-west&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await saveNumberMapping(page, '+12605550223', 'Duplicate Seed');

        await page.getByTestId('connectshyft-number-input').fill('+12605550223');
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
            hasText: '+12605550223',
          }),
        ).toHaveCount(1);
      },
    );

    test(
      '[P1] invalid non-E.164 values keep form feedback deterministic and prevent table mutation @P1',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNumbersUrl(
            'tenantId=tenant-connectshyft-alpha-a3m3&orgUnitId=org-connectshyft-alpha-a3m3-east&tenantRole=ORGUNIT_ADMIN',
          ),
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

    test(
      '[P1] mapping edit flow preserves multi-number visibility and deterministic table ordering after successful update @P1',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNumbersUrl(
            'tenantId=tenant-connectshyft-alpha-a3m4&orgUnitId=org-connectshyft-alpha-a3m4-east&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await saveNumberMapping(page, '+12605550311', 'Primary Dispatch');
        await saveNumberMapping(page, '+12605550312', 'Overflow Dispatch');

        await expect(page.getByTestId('connectshyft-number-mapping-row')).toHaveCount(2);
        await page
          .getByTestId('connectshyft-number-mapping-row')
          .filter({ hasText: '+12605550311' })
          .getByRole('button', { name: 'Edit' })
          .click();

        await page.getByTestId('connectshyft-number-input').fill('+12605550319');
        const updateResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers/')
            && response.request().method() === 'PUT',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await updateResponse;

        const rows = page.getByTestId('connectshyft-number-mapping-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText('+12605550312');
        await expect(rows.nth(1)).toContainText('+12605550319');
      },
    );
  },
);
