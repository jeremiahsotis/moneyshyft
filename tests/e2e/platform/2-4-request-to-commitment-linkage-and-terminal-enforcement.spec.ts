import { test, expect } from '../../support/fixtures/moneyShyftStory24.fixture';
import { login } from '../../helpers/auth';

function buildUiPath(tenantId: string, orgUnitId: string): string {
  return '/app/route/requests?tenantId=' + tenantId + '&orgUnitId=' + orgUnitId;
}

test.describe('Story 2.4 automate - request lifecycle operator journeys', () => {
  test.describe.configure({ mode: 'serial' });
  const utcIsoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/;

  test('[P1] operations lifecycle view shows explicit terminal status and reconciliation actions for unresolved work @P1', async ({ page, story24Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/route/intake/reconciliation/unresolved')
        && response.request().method() === 'GET',
    );

    await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));
    await loadResponse;

    await expect(page.getByRole('heading', { name: 'Request Lifecycle' })).toBeVisible();
    await expect(page.getByTestId('moneyshyft-request-terminal-status')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-request-reconciliation-actions')).toBeVisible();
  });

  test('[P1] finalize action surfaces deterministic refusal code and lifecycle reconciliation details @P1', async ({ page, story24Context }) => {
    await login(page);

    const submitResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/route/intake/requests')
        && response.request().method() === 'POST',
    );

    await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));
    await page.getByTestId('moneyshyft-request-finalize-submit').click();
    await submitResponse;

    await expect(page.getByTestId('moneyshyft-request-refusal-banner')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-request-refusal-code')).toBeVisible();
    await expect(page.getByTestId('moneyshyft-request-lifecycle-details')).toBeVisible();
  });

  test('[P1] lifecycle view preserves required request lifecycle test-id contract across refresh @P1', async ({ page, story24Context }) => {
    await login(page);

    await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));

    for (const testId of story24Context.requiredTestIds) {
      await expect(page.getByTestId(testId)).toHaveCount(1);
    }

    await page.reload();

    for (const testId of story24Context.requiredTestIds) {
      await expect(page.getByTestId(testId)).toHaveCount(1);
    }
  });

  test('[P1] lifecycle details do not display raw UTC ISO strings on operational screen @P1', async ({ page, story24Context }) => {
    await login(page);

    const loadResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/route/intake/reconciliation/unresolved')
        && response.request().method() === 'GET',
    );

    await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));
    await loadResponse;

    const details = page.getByTestId('moneyshyft-request-lifecycle-details');
    await expect(details).toBeVisible();
    await expect(details).not.toContainText(utcIsoPattern);

    const submitResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/route/intake/requests')
        && response.request().method() === 'POST',
    );
    await page.getByTestId('moneyshyft-request-finalize-submit').click();
    await submitResponse;

    await expect(details).not.toContainText(utcIsoPattern);
  });
});
