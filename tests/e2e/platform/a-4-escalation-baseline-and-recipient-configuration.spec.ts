import type { Page } from '@playwright/test';
import { test, expect } from '../../support/fixtures/connectShyftStoryA4.fixture';
import { login } from '../../helpers/auth';

const buildEscalationUrl = (query: string): string =>
  `/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&${query}`;

const fillValidRecipients = async (page: Page): Promise<void> => {
  await page.getByTestId('connectshyft-escalation-recipient-primary').selectOption(
    'user-connectshyft-a4-primary-recipient',
  );
  await page.getByTestId('connectshyft-escalation-recipient-secondary').selectOption(
    'user-connectshyft-a4-secondary-recipient',
  );
  await page.getByTestId('connectshyft-escalation-recipient-tenant-staff').selectOption(
    'user-connectshyft-a4-tenant-staff-recipient',
  );
};

test.describe(
  'Story a.4 automate - escalation baseline and recipient configuration operator journeys',
  () => {
    test.fixme(
      '[P0] orgUnit admin saves valid escalation baseline and recipient targets from settings screen @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildEscalationUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await expect(
          page.getByRole('heading', {
            name: 'ConnectShyft Escalation Settings',
          }),
        ).toBeVisible();

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('6');
        await fillValidRecipients(page);

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

    test.fixme(
      '[P0] invalid baseline values are blocked with deterministic validation feedback and no save confirmation @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildEscalationUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('25');
        await fillValidRecipients(page);
        await page.getByRole('button', { name: 'Save Escalation Settings' }).click();

        await expect(page.getByTestId('connectshyft-escalation-validation-error')).toContainText(
          'Use whole hours between 1 and 24',
        );
        await expect(page.getByTestId('connectshyft-escalation-save-success')).toHaveCount(0);
      },
    );

    test.fixme(
      '[P1] missing required primary recipient shows deterministic refusal state and blocks persistence @P1',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildEscalationUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
          ),
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

    test.fixme(
      '[P1] cross-tenant recipient selections are rejected with deterministic refusal messaging and no persisted state @P1',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildEscalationUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_ADMIN',
          ),
        );

        await page.getByTestId('connectshyft-escalation-baseline-input').fill('8');
        await page.getByTestId('connectshyft-escalation-recipient-primary').selectOption(
          'user-connectshyft-a4-cross-tenant-recipient',
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

        await expect(page.getByTestId('connectshyft-escalation-validation-error')).toContainText(
          'Recipient must belong to the active tenant and orgUnit scope',
        );
        await expect(page.getByTestId('connectshyft-escalation-save-success')).toHaveCount(0);
      },
    );
  },
);
