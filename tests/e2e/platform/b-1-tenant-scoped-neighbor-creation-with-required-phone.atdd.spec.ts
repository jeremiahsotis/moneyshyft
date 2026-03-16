import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryB1Context, createStoryB1Headers } from '../../support/factories/connectShyftStoryB1Factory';

test.describe(
  'Story b.1 Tenant-Scoped Neighbor Creation with Required Phone (ATDD E2E)',
  () => {
    test(
      '[P0] operator can submit neighbor create form with one valid phone and see normalized result state @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          '/app/connectshyft/neighbors/new?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
        );

        await expect(page.getByRole('heading', { name: 'Create Neighbor' })).toBeVisible();

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Mina');
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill('Lopez');
        await page.getByTestId('connectshyft-neighbor-phone-input').fill('+1 (260) 555-0199');
        await page.getByTestId('connectshyft-neighbor-phone-label-select').selectOption('mobile');

        const createResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/neighbors')
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Create Neighbor' }).click();
        await createResponse;

        await expect(page.getByTestId('connectshyft-neighbor-create-success')).toContainText(
          'Neighbor created',
        );
        await expect(page.getByTestId('connectshyft-neighbor-phone-value')).toContainText(
          '+12605550199',
        );
      },
    );

    test(
      '[P0] operator sees deterministic validation refusal when submitting create flow without phone values @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          '/app/connectshyft/neighbors/new?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
        );

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Noah');
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill('Harper');
        await page.getByRole('button', { name: 'Create Neighbor' }).click();

        await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toContainText(
          'at least one phone',
        );
      },
    );

    test(
      '[P1] cross-tenant or invalid-scope create attempts surface deterministic refusal envelope semantics @P1',
      async ({ request }) => {
        const context = createStoryB1Context();
        const headers = createStoryB1Headers(context, {
          role: 'ORGUNIT_MEMBER',
          orgUnitMemberships: [context.orgUnitId],
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: context.paths.neighborsCollection,
          headers,
          data: {
            orgUnitId: context.crossTenantOrgUnitId,
            firstName: 'Jules',
            lastName: 'North',
            phones: [
              {
                label: 'mobile',
                value: context.validPhoneRaw,
              },
            ],
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          refusalType: 'business',
          correlationId: expect.any(String),
          tenantId: context.tenantId,
        });
      },
    );
  },
);
