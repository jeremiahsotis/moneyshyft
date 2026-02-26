import { test, expect } from '../../support/fixtures/routeShyftStory24.fixture';
import { login } from '../../helpers/auth';

function buildUiPath(tenantId: string, orgUnitId: string): string {
  return '/app/route/requests?tenantId=' + tenantId + '&orgUnitId=' + orgUnitId;
}

test.describe('Story 2.4 automate - request lifecycle operator journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P1] operations lifecycle view shows explicit terminal status and reconciliation actions for unresolved work @P1',
    async ({ page, story24Context }) => {
      await login(page);

      const loadResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/route/intake/reconciliation/unresolved')
          && response.request().method() === 'GET',
      );

      await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));
      await loadResponse;

      await expect(page.getByRole('heading', { name: 'Request Lifecycle' })).toBeVisible();
      await expect(page.getByTestId('routeshyft-request-terminal-status')).toBeVisible();
      await expect(page.getByTestId('routeshyft-request-reconciliation-actions')).toBeVisible();
    },
  );

  test.fixme(
    '[P1] finalize action surfaces deterministic refusal code and lifecycle reconciliation details @P1',
    async ({ page, story24Context }) => {
      await login(page);

      const submitResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/route/intake/requests')
          && response.request().method() === 'POST',
      );

      await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));
      await page.getByTestId('routeshyft-request-finalize-submit').click();
      await submitResponse;

      await expect(page.getByTestId('routeshyft-request-refusal-banner')).toBeVisible();
      await expect(page.getByTestId('routeshyft-request-refusal-code')).toBeVisible();
      await expect(page.getByTestId('routeshyft-request-lifecycle-details')).toBeVisible();
    },
  );

  test.fixme(
    '[P1] lifecycle view preserves required request lifecycle test-id contract across refresh @P1',
    async ({ page, story24Context }) => {
      await login(page);

      await page.goto(buildUiPath(story24Context.tenantId, story24Context.orgUnitId));

      for (const testId of story24Context.requiredTestIds) {
        await expect(page.getByTestId(testId)).toHaveCount(1);
      }

      await page.reload();

      for (const testId of story24Context.requiredTestIds) {
        await expect(page.getByTestId(testId)).toHaveCount(1);
      }
    },
  );
});
