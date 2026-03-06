import { test, expect } from '../../support/fixtures/connectShyftStoryA3.fixture';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { login } from '../../helpers/auth';

type NumberMappingScope = {
  tenantId: string;
  orgUnitId: string;
};

const buildUniqueTwilioNumber = (): string => {
  const seed = randomUUID()
    .replace(/-/g, '')
    .split('')
    .map((char) => (Number.parseInt(char, 16) % 10).toString())
    .join('')
    .slice(0, 7);
  return `+1260${seed}`;
};

const createScopedNumbersContext = (
  lane: string,
  orgUnitSuffix: 'east' | 'west' = 'east',
): NumberMappingScope => {
  const runSuffix = randomUUID().replace(/-/g, '').slice(0, 8);
  const tenantSegment = `alpha-${lane}-${runSuffix}`;

  return {
    tenantId: `tenant-connectshyft-${tenantSegment}`,
    orgUnitId: `org-connectshyft-${tenantSegment}-${orgUnitSuffix}`,
  };
};

const buildNumbersUrl = (
  scope: NumberMappingScope,
  tenantRole = 'ORGUNIT_ADMIN',
): string =>
  `/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=${encodeURIComponent(scope.tenantId)}&orgUnitId=${encodeURIComponent(scope.orgUnitId)}&tenantRole=${encodeURIComponent(tenantRole)}`;

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
  const response = await saveResponse;
  expect([200, 201]).toContain(response.status());
  const body = await response.json();
  expect(body?.ok).toBe(true);
};

test.describe(
  'Story a.3 automate - orgUnit number mapping management operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] orgUnit admins can add multiple valid mappings and see deterministic table state after each save @P0',
      async ({ page }) => {
        const scope = createScopedNumbersContext('a3m1');
        const firstNumber = buildUniqueTwilioNumber();
        const secondNumber = buildUniqueTwilioNumber();

        await login(page);
        await page.goto(buildNumbersUrl(scope));

        await expect(
          page.getByRole('heading', {
            name: 'ConnectShyft Numbers & OrgUnit Config',
          }),
        ).toBeVisible();

        await saveNumberMapping(page, firstNumber, 'Overflow Dispatch');
        await saveNumberMapping(page, secondNumber, 'Primary Dispatch');

        const rows = page.getByTestId('connectshyft-number-mapping-row');
        await expect(rows).toHaveCount(2, { timeout: 10000 });
        const expectedOrder = [firstNumber, secondNumber].sort((left, right) => left.localeCompare(right));
        await expect(rows.nth(0)).toContainText(expectedOrder[0]);
        await expect(rows.nth(1)).toContainText(expectedOrder[1]);
      },
    );

    test(
      '[P0] duplicate tenant numbers show actionable refusal copy and do not create an extra mapping row @P0',
      async ({ page }) => {
        const scope = createScopedNumbersContext('a3m2', 'west');
        const duplicateNumber = buildUniqueTwilioNumber();

        await login(page);
        await page.goto(buildNumbersUrl(scope));

        await saveNumberMapping(page, duplicateNumber, 'Duplicate Seed');

        await page.getByTestId('connectshyft-number-input').fill(duplicateNumber);
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
            hasText: duplicateNumber,
          }),
        ).toHaveCount(1);
      },
    );

    test(
      '[P1] invalid non-E.164 values keep form feedback deterministic and prevent table mutation @P1',
      async ({ page }) => {
        const scope = createScopedNumbersContext('a3m3');
        await login(page);
        await page.goto(buildNumbersUrl(scope));

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
        const scope = createScopedNumbersContext('a3m4');
        const originalNumber = buildUniqueTwilioNumber();
        const overflowNumber = buildUniqueTwilioNumber();
        const updatedNumber = buildUniqueTwilioNumber();

        await login(page);
        await page.goto(buildNumbersUrl(scope));

        await saveNumberMapping(page, originalNumber, 'Primary Dispatch');
        await saveNumberMapping(page, overflowNumber, 'Overflow Dispatch');

        await expect(page.getByTestId('connectshyft-number-mapping-row')).toHaveCount(2);
        await page
          .getByTestId('connectshyft-number-mapping-row')
          .filter({ hasText: originalNumber })
          .getByRole('button', { name: 'Edit' })
          .click();

        await page.getByTestId('connectshyft-number-input').fill(updatedNumber);
        const updateResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/numbers/')
            && response.request().method() === 'PUT',
        );
        await page.getByRole('button', { name: 'Save Number Mapping' }).click();
        await updateResponse;

        const rows = page.getByTestId('connectshyft-number-mapping-row');
        await expect(rows).toHaveCount(2);
        const expectedOrder = [overflowNumber, updatedNumber].sort((left, right) => left.localeCompare(right));
        await expect(rows.nth(0)).toContainText(expectedOrder[0]);
        await expect(rows.nth(1)).toContainText(expectedOrder[1]);
      },
    );
  },
);
