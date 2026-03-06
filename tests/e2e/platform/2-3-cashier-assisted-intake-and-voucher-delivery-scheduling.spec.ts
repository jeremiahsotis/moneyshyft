import { test, expect } from '../../support/fixtures/routeShyftStory23.fixture';
import { login } from '../../helpers/auth';

const CASHIER_UI_IMPLEMENTATION_GAP =
  "Story 2.3 cashier UI route ('/app/route/intake/cashier') is not implemented yet.";

test.describe('Story 2.3 automate - cashier-assisted intake operator journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P1] cashier sees immediate actionable accepted-outcome feedback after intake submit @P1',
    async ({ page, story23Context }) => {
      await login(page);

      const submitResponse = page.waitForResponse(
        (response) =>
          response.url().includes(story23Context.paths.resourceCollection)
          && response.request().method() === 'POST',
      );

      await page.goto(
        story23Context.paths.ui
          + '?tenantId='
          + story23Context.tenantId
          + '&orgUnitId='
          + story23Context.orgUnitId,
      );

      await page.getByTestId('routeshyft-cashier-intake-submit').click();
      await submitResponse;

      await expect(page.getByTestId('routeshyft-cashier-intake-outcome')).toBeVisible();
      await expect(page.getByTestId('routeshyft-cashier-intake-next-steps')).toBeVisible();
    },
  );

  test.fixme(
    '[P1] cashier sees deterministic refusal code and alternatives for constrained delivery requests @P1',
    async ({ page, story23Context }) => {
      await login(page);

      const submitResponse = page.waitForResponse(
        (response) =>
          response.url().includes(story23Context.paths.resourceCollection)
          && response.request().method() === 'POST',
      );

      await page.goto(
        story23Context.paths.ui
          + '?tenantId='
          + story23Context.tenantId
          + '&orgUnitId='
          + story23Context.orgUnitId,
      );

      await page.getByTestId('routeshyft-cashier-intake-submit').click();
      await submitResponse;

      await expect(page.getByTestId('routeshyft-cashier-intake-refusal-banner')).toBeVisible();
      await expect(page.getByTestId('routeshyft-cashier-intake-refusal-code')).toContainText(
        story23Context.refusalCode,
      );
      await expect(page.getByTestId('routeshyft-cashier-intake-alternatives')).toBeVisible();
    },
  );

  test.fixme(
    '[P1] cashier journey preserves required parity test-id contract across success and refusal states @P1',
    async ({ page, story23Context }) => {
      await login(page);
      await page.goto(
        story23Context.paths.ui
          + '?tenantId='
          + story23Context.tenantId
          + '&orgUnitId='
          + story23Context.orgUnitId,
      );

      for (const testId of story23Context.requiredTestIds) {
        await expect(page.getByTestId(testId)).toHaveCount(1);
      }
    },
  );
});
