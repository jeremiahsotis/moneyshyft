import { test, expect } from '../../support/fixtures/routeShyftStory21.fixture';
import { login } from '../../helpers/auth';

test.describe('Story 2.1 Commitment Domain Model and Transition Rules (ATDD E2E RED)', () => {
  test.skip(
    '[P1] dispatcher lifecycle view shows explicit current state and only valid transition actions @P1',
    async ({ page, story21Context }) => {
      await login(page);

      const lifecycleLoad = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/route/commitments')
          && response.request().method() === 'GET',
      );

      await page.goto(
        `${story21Context.paths.commitmentsUi}?tenantId=${story21Context.tenantId}&orgUnitId=${story21Context.orgUnitId}`,
      );
      await lifecycleLoad;

      await expect(page.getByRole('heading', { name: 'Commitments' })).toBeVisible();
      await expect(page.getByTestId('routeshyft-commitment-status-badge')).toContainText('Draft');
      await expect(page.getByTestId('routeshyft-commitment-transition-select')).toBeVisible();
      await expect(page.getByTestId('routeshyft-commitment-transition-submit')).toBeEnabled();
      await expect(page.getByTestId('routeshyft-commitment-transition-select')).not.toContainText('Completed');
    },
  );

  test.skip(
    '[P1] dispatcher sees deterministic refusal code, reason, and actionable guidance for invalid transition attempts @P1',
    async ({ page, story21Context }) => {
      await login(page);

      const transitionResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/api/v1/route/commitments')
          && response.request().method() === 'POST',
      );

      await page.goto(
        `${story21Context.paths.commitmentsUi}?tenantId=${story21Context.tenantId}&orgUnitId=${story21Context.orgUnitId}`,
      );

      await page.getByTestId('routeshyft-commitment-transition-select').selectOption('completed');
      await page.getByTestId('routeshyft-commitment-transition-reason-input').fill(
        'Attempt invalid transition',
      );
      await page.getByTestId('routeshyft-commitment-transition-submit').click();
      await transitionResponse;

      await expect(page.getByTestId('routeshyft-commitment-refusal-banner')).toBeVisible();
      await expect(page.getByTestId('routeshyft-commitment-refusal-code')).toHaveText(
        'ROUTESHYFT_COMMITMENT_TRANSITION_INVALID',
      );
      await expect(page.getByTestId('routeshyft-commitment-refusal-details')).toContainText(
        'Use allowed transition path',
      );
    },
  );
});
