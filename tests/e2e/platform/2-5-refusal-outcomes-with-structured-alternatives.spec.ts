import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { createStory25Context } from '../../support/factories/routeShyftStory25Factory';

const buildRefusalUrl = (options: {
  tenantId: string;
  orgUnitId: string;
  tenantRole?: string;
}): string => {
  const params = new URLSearchParams({
    tenantId: options.tenantId,
    orgUnitId: options.orgUnitId,
    tenantRole: options.tenantRole ?? 'DISPATCHER',
  });

  return '/app/route/refusals?' + params.toString();
};

test.describe('Story 2.5 automate - refusal outcomes requester/staff journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.fixme(
    '[P1] requester/staff view surfaces refusal reason, structured alternatives, and next-step guidance @P1',
    async ({ page }) => {
      const context = createStory25Context();

      const refusalSubmitResponse = page.waitForResponse(
        (response) =>
          response.url().includes(context.paths.resourceCollection)
          && response.request().method() === 'POST',
      );

      await login(page);
      await page.goto(
        buildRefusalUrl({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
        }),
      );

      await page.getByTestId('routeshyft-refusal-submit').click();
      await refusalSubmitResponse;

      await expect(page.getByRole('heading', { name: 'Refusal Outcomes' })).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-outcome-banner')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-code')).toContainText(context.refusalCode);
      await expect(page.getByTestId('routeshyft-refusal-alternatives-list')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-next-steps')).toBeVisible();
    },
  );

  test.fixme(
    '[P1] refusal history timeline shows deterministic refusal metadata after submission @P1',
    async ({ page }) => {
      const context = createStory25Context();

      const refusalSubmitResponse = page.waitForResponse(
        (response) =>
          response.url().includes(context.paths.resourceCollection)
          && response.request().method() === 'POST',
      );

      await login(page);
      await page.goto(
        buildRefusalUrl({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
        }),
      );

      await page.getByTestId('routeshyft-refusal-submit').click();
      await refusalSubmitResponse;

      await expect(page.getByTestId('routeshyft-refusal-audit-history')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-audit-history')).toContainText(
        context.refusalCode,
      );
    },
  );

  test.fixme(
    '[P1] deep-link retrieval failures keep refusal-only state visible with no commitment detail leakage @P1',
    async ({ page }) => {
      const context = createStory25Context();
      const unknownRequestId = 'missing-' + Date.now();

      const historyResponse = page.waitForResponse(
        (response) =>
          response.url().includes(context.paths.resourceCollection + '/' + unknownRequestId)
          && response.request().method() === 'GET',
      );

      await login(page);
      await page.goto(
        buildRefusalUrl({
          tenantId: context.tenantId,
          orgUnitId: context.orgUnitId,
        }) + '&requestId=' + unknownRequestId,
      );
      await historyResponse;

      await expect(page.getByTestId('routeshyft-refusal-outcome-banner')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-code')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-audit-history')).toBeVisible();
      await expect(page.getByTestId('routeshyft-refusal-audit-history')).not.toContainText(
        'commitment-secret',
      );
    },
  );
});
