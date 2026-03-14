import { test, expect } from '../../support/fixtures/moneyShyftStory23.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2-3 Cashier-Assisted Intake and Voucher Delivery Scheduling (ATDD E2E RED)', () => {
  test.skip('[P1] cashier sees immediate actionable feedback and accepted outcome details after submit @P1', async ({ page, story23Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) => response.url().includes(story23Context.paths.resourceCollection) && response.request().method() === 'GET',
    );

    await page.goto(story23Context.paths.ui + '?tenantId=' + story23Context.tenantId + '&orgUnitId=' + story23Context.orgUnitId);
    await loadResponse;

    await expect(page.getByRole('heading', { name: 'Cashier Intake' })).toBeVisible();
    await expect(page.getByTestId('moneyshyft-cashier-intake-outcome')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-cashier-intake-next-steps')).toBeVisible();
  });

  test.skip('[P1] cashier sees parity-aligned refusal reasons and alternatives for invalid or constrained submissions @P1', async ({ page, story23Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story23Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story23Context.paths.ui + '?tenantId=' + story23Context.tenantId + '&orgUnitId=' + story23Context.orgUnitId);
    await page.getByRole('button', { name: 'Create Intake Request' }).click();
    await submitResponse;

    await expect(page.getByTestId('moneyshyft-cashier-intake-refusal-banner')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-cashier-intake-refusal-code')).toHaveText(story23Context.refusalCode);
    await expect(page.getByTestId('moneyshyft-cashier-intake-alternatives')).toBeVisible();
  });
});
