import { test, expect } from '../../support/fixtures/routeShyftStory22.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2-2 Donor Self-Service Pickup Intake with Capacity Check (ATDD E2E RED)', () => {
  test.skip('[P1] donor sees schedulable slots and clear next-step guidance after intake submit @P1', async ({ page, story22Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) => response.url().includes(story22Context.paths.resourceCollection) && response.request().method() === 'GET',
    );

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId);
    await loadResponse;

    await expect(page.getByRole('heading', { name: 'Donor Pickup Intake' })).toBeVisible();
    await expect(page.getByTestId('routeshyft-donor-intake-slot-list')).toBeVisible();
    await expect(page.getByTestId('routeshyft-donor-intake-next-steps')).toBeVisible();
  });

  test.skip('[P1] donor sees explicit refusal reason code and alternatives when no capacity is available @P1', async ({ page, story22Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story22Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story22Context.paths.ui + '?tenantId=' + story22Context.tenantId + '&orgUnitId=' + story22Context.orgUnitId);
    await page.getByRole('button', { name: 'Submit Pickup Request' }).click();
    await submitResponse;

    await expect(page.getByTestId('routeshyft-donor-intake-refusal-banner')).toBeVisible();
    await expect(page.getByTestId('routeshyft-donor-intake-refusal-code')).toHaveText(story22Context.refusalCode);
    await expect(page.getByTestId('routeshyft-donor-intake-alternatives')).toBeVisible();
  });
});
