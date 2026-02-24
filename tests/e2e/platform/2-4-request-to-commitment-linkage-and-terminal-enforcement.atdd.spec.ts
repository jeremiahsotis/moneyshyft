import { test, expect } from '../../support/fixtures/routeShyftStory24.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2-4 Request-to-Commitment Linkage and Terminal Enforcement (ATDD E2E RED)', () => {
  test.skip('[P1] operations view surfaces explicit terminal request status and lifecycle details @P1', async ({ page, story24Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) => response.url().includes(story24Context.paths.resourceCollection) && response.request().method() === 'GET',
    );

    await page.goto(story24Context.paths.ui + '?tenantId=' + story24Context.tenantId + '&orgUnitId=' + story24Context.orgUnitId);
    await loadResponse;

    await expect(page.getByRole('heading', { name: 'Request Lifecycle' })).toBeVisible();
    await expect(page.getByTestId('routeshyft-request-terminal-status')).toBeVisible();
    await expect(page.getByTestId('routeshyft-request-reconciliation-actions')).toBeVisible();
  });

  test.skip('[P1] operations view surfaces clear reconciliation actions for unresolved linkage or terminal failures @P1', async ({ page, story24Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes(story24Context.paths.resourceCollection) && response.request().method() === 'POST',
    );

    await page.goto(story24Context.paths.ui + '?tenantId=' + story24Context.tenantId + '&orgUnitId=' + story24Context.orgUnitId);
    await page.getByRole('button', { name: 'Finalize Request' }).click();
    await submitResponse;

    await expect(page.getByTestId('routeshyft-request-refusal-banner')).toBeVisible();
    await expect(page.getByTestId('routeshyft-request-refusal-code')).toHaveText(story24Context.refusalCode);
    await expect(page.getByTestId('routeshyft-request-lifecycle-details')).toBeVisible();
  });
});
