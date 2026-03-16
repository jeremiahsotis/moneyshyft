import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth';
import { apiRequest } from '../../support/helpers/apiClient';
import { createStoryB1Context, createStoryB1Headers } from '../../support/factories/connectShyftStoryB1Factory';

const buildNeighborCreateUrl = (query: string): string =>
  `/app/connectshyft/neighbors/new?flags=module:on,inbox:on,escalation:on,webhooks:on&${query}`;

test.describe(
  'Story b.1 automate - tenant-scoped neighbor creation operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] operator submits valid neighbor create form and sees normalized phone result state @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNeighborCreateUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
          ),
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
      '[P0] operator sees deterministic validation refusal when create flow omits phones @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNeighborCreateUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
          ),
        );

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Noah');
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill('Harper');
        await page.getByRole('button', { name: 'Create Neighbor' }).click();

        await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toContainText(
          'at least one phone',
        );
        await expect(page.getByTestId('connectshyft-neighbor-create-success')).toHaveCount(0);
      },
    );

    test(
      '[P1] tenant-viewer role is blocked with deterministic refusal messaging and no success state @P1',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNeighborCreateUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=TENANT_VIEWER',
          ),
        );

        await page.getByTestId('connectshyft-neighbor-first-name-input').fill('Ari');
        await page.getByTestId('connectshyft-neighbor-last-name-input').fill('Quinn');
        await page.getByTestId('connectshyft-neighbor-phone-input').fill('+1 (260) 555-0199');
        await page.getByTestId('connectshyft-neighbor-phone-label-select').selectOption('mobile');

        const refusalResponse = page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/connectshyft/neighbors')
            && response.request().method() === 'POST',
        );

        await page.getByRole('button', { name: 'Create Neighbor' }).click();
        await refusalResponse;

        await expect(page.getByTestId('connectshyft-neighbor-validation-error')).toContainText(
          'authorized ConnectShyft role',
        );
        await expect(page.getByTestId('connectshyft-neighbor-create-success')).toHaveCount(0);
      },
    );

    test(
      '[P1] cross-tenant create attempts surface deterministic refusal envelope semantics @P1',
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
          tenantId: null,
        });
      },
    );
  },
);
