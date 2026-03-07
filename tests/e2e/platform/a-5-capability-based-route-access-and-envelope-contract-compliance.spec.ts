import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryA5.fixture';
import { login } from '../../helpers/auth';

const buildNumbersUrl = (query: string): string =>
  `/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&${query}`;

const buildEscalationUrl = (query: string): string =>
  `/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&${query}`;

test.describe(
  'Story a.5 automate - capability-based access and envelope compliance operator journeys',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      '[P0] orgUnit-member number mapping admin-path deep links show deterministic refusal guidance and no admin controls @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildNumbersUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
          ),
        );

        await expect(page).toHaveURL(/\/app\/connectshyft\/settings\?/);
        await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
        await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
          '/app/connectshyft/settings/numbers',
        );
        await expect(page.getByTestId('connectshyft-number-mappings-form')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-more-admin-option-numbers')).toHaveCount(0);
      },
    );

    test(
      '[P0] tenant-viewer escalation admin-path deep links keep refusal guidance visible and hide admin controls @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          buildEscalationUrl(
            'tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=TENANT_VIEWER',
          ),
        );

        await expect(page).toHaveURL(/\/app\/connectshyft\/settings\?/);
        await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toBeVisible();
        await expect(page.getByTestId('connectshyft-settings-refusal-guidance')).toContainText(
          '/app/connectshyft/settings/escalation',
        );
        await expect(page.getByTestId('connectshyft-escalation-settings-form')).toHaveCount(0);
        await expect(page.getByTestId('connectshyft-more-admin-option-escalation')).toHaveCount(0);
      },
    );

    test(
      '[P1] journey-level contract keeps canonical envelope keys across success refusal and system-error responses @P1',
      async ({
        request,
        storyA5Context,
        storyA5OrgUnitAdminHeaders,
        storyA5TenantViewerHeaders,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: storyA5Context.paths.threadEnsure,
          headers: storyA5OrgUnitAdminHeaders,
          data: {
            orgUnitId: storyA5Context.orgUnitId,
            neighborId: 'neighbor-a5-envelope-success',
          },
        });

        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: storyA5Context.paths.threadClaim,
          headers: storyA5TenantViewerHeaders,
          data: {
            reason: 'a5-envelope-refusal',
          },
        });

        const systemErrorResponse = await apiRequest(request, {
          method: 'POST',
          path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
          headers: storyA5OrgUnitAdminHeaders,
          data: {
            reason: 'a5-system-error-probe',
          },
        });

        expect(successResponse.status()).toBe(201);
        expect(refusalResponse.status()).toBe(200);
        expect(systemErrorResponse.status()).toBe(500);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const systemErrorBody = await systemErrorResponse.json();

        const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(successBody, key),
          ),
        ).toBe(true);
        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(refusalBody, key),
          ),
        ).toBe(true);
        expect(
          requiredKeys.every((key) =>
            Object.prototype.hasOwnProperty.call(systemErrorBody, key),
          ),
        ).toBe(true);

        expect(successBody).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_ENSURED',
        });
        expect(refusalBody).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_CLAIM_FORBIDDEN',
          refusalType: 'business',
        });
        expect(systemErrorBody).toMatchObject({
          ok: false,
          errorType: 'system',
          code: 'ENVELOPE_SYSTEM_ERROR',
        });
      },
    );
  },
);
