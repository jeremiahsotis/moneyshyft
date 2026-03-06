import { test, expect } from '../../support/fixtures/moneyShyftStory22.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2-2 Donor Self-Service Pickup Intake with Capacity Check (Automate E2E Expansion)', () => {
  test.skip('[P1] keeps submit disabled until donor intake required fields are complete @P1', async ({ page, story22Context }) => {
    await login(page);

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId);

    await expect(page.getByTestId('moneyshyft-donor-intake-submit')).toBeDisabled();
    await page.getByTestId('moneyshyft-donor-intake-item-summary').fill('Sofa and lamp');
    await page.getByTestId('moneyshyft-donor-intake-window-start').fill('2026-02-27T14:00');
    await page.getByTestId('moneyshyft-donor-intake-window-end').fill('2026-02-27T16:00');
    await expect(page.getByTestId('moneyshyft-donor-intake-submit')).toBeEnabled();
  });

  test.skip('[P1] renders schedulable slot outcomes with next-step guidance and no refusal banner @P1', async ({ page, story22Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story22Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId);
    await page.getByTestId('moneyshyft-donor-intake-submit').click();
    await submitResponse;

    await expect(page.getByTestId('moneyshyft-donor-intake-slot-list')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-donor-intake-next-steps')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-donor-intake-refusal-banner')).toBeHidden();
  });

  test.skip('[P1] renders refusal alternatives and reason code when capacity rejects the intake @P1', async ({ page, story22Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story22Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId + '&forceRefusal=true');
    await page.getByTestId('moneyshyft-donor-intake-submit').click();
    await submitResponse;

    await expect(page.getByTestId('moneyshyft-donor-intake-refusal-banner')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-donor-intake-refusal-code')).toHaveText(story22Context.refusalCode);
    await expect(page.getByTestId('moneyshyft-donor-intake-alternatives')).toBeVisible();
  });

  test.skip('[P2] prevents duplicate submissions when donor double-clicks submit during request in-flight @P2', async ({ page, story22Context }) => {
    await login(page);

    let submitCount = 0;
    await page.route('**' + story22Context.paths.resourceCollection + '**', async (route) => {
      if (route.request().method() === 'POST') {
        submitCount += 1;
      }
      await route.continue();
    });

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId);
    const submitButton = page.getByTestId('moneyshyft-donor-intake-submit');
    await submitButton.dblclick();

    await expect.poll(() => submitCount, { timeout: 5000 }).toBeLessThanOrEqual(1);
  });
});