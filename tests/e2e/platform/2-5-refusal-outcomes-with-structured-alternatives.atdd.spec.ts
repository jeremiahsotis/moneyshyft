import { test, expect } from '../../support/fixtures/routeShyftStory25.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2-5 Refusal Outcomes with Structured Alternatives (ATDD E2E RED)', () => {
  test.skip('[P1] requester/staff view shows refusal reason with structured alternatives and next steps @P1', async ({ page, story25Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) => response.url().includes(story25Context.paths.resourceCollection) && response.request().method() === 'GET',
    );

    await page.goto(story25Context.paths.ui + '?tenantId=' + story25Context.tenantId + '&orgUnitId=' + story25Context.orgUnitId);
    await loadResponse;

    await expect(page.getByRole('heading', { name: 'Refusal Outcomes' })).toBeVisible();
    await expect(page.getByTestId('routeshyft-refusal-outcome-banner')).toBeVisible();
    await expect(page.getByTestId('routeshyft-refusal-next-steps')).toBeVisible();
  });

  test.skip('[P1] refusal history view surfaces deterministic refusal metadata in audit timeline @P1', async ({ page, story25Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story25Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story25Context.paths.ui + '?tenantId=' + story25Context.tenantId + '&orgUnitId=' + story25Context.orgUnitId);
    await page.getByRole('button', { name: 'Record Refusal' }).click();
    await submitResponse;

    await expect(page.getByTestId('routeshyft-refusal-code')).toBeVisible();
    await expect(page.getByTestId('routeshyft-refusal-alternatives-list')).toHaveText(story25Context.refusalCode);
    await expect(page.getByTestId('routeshyft-refusal-audit-history')).toBeVisible();
  });
});
