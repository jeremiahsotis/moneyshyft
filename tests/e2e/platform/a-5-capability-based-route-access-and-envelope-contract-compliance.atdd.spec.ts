import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStoryA5Context,
  createStoryA5Headers,
} from '../../support/factories/connectShyftStoryA5Factory';
import { login } from '../../helpers/auth';

test.describe(
  'Story a.5 Capability-Based Route Access and Envelope Contract Compliance (ATDD E2E)',
  () => {
    test(
      '[P0] orgUnit-member number mapping admin-path deep links are redirected to deterministic refusal guidance @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          '/app/connectshyft/settings/numbers?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=ORGUNIT_MEMBER&orgUnitMemberships=org-connectshyft-alpha-east',
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
      '[P0] tenant-viewer escalation admin-path deep links are redirected with refusal guidance and no admin controls @P0',
      async ({ page }) => {
        await login(page);
        await page.goto(
          '/app/connectshyft/settings/escalation?flags=module:on,inbox:on,escalation:on,webhooks:on&tenantId=tenant-connectshyft-alpha&orgUnitId=org-connectshyft-alpha-east&tenantRole=TENANT_VIEWER',
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
      '[P1] journey contract preserves shared top-level envelope keys across success refusal and system-error responses @P1',
      async ({ request }) => {
        const context = createStoryA5Context();

        const adminHeaders = createStoryA5Headers(context, {
          role: 'ORGUNIT_ADMIN',
          userId: context.orgUnitAdminUserId,
          orgUnitMemberships: [context.orgUnitId],
        });
        const tenantViewerHeaders = createStoryA5Headers(context, {
          role: 'TENANT_VIEWER',
          userId: context.tenantViewerUserId,
        });

        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadEnsure,
          headers: adminHeaders,
          data: {
            orgUnitId: context.orgUnitId,
            neighborId: 'neighbor-a5-envelope-success',
          },
        });

        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.threadClaim,
          headers: tenantViewerHeaders,
          data: {
            reason: 'atdd-a5-envelope-refusal',
          },
        });

        const systemErrorResponse = await apiRequest(request, {
          method: 'POST',
          path: context.paths.envelopeSystemErrorContract,
          headers: adminHeaders,
          data: {
            reason: 'atdd-a5-system-error-probe',
          },
        });

        expect(successResponse.status()).toBe(201);
        expect(refusalResponse.status()).toBe(200);
        expect(systemErrorResponse.status()).toBe(500);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const systemErrorBody = await systemErrorResponse.json();

        const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
        expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(systemErrorBody, key))).toBe(true);

        expect(systemErrorBody).toMatchObject({
          ok: false,
          errorType: 'system',
          code: expect.any(String),
          message: expect.any(String),
        });
      },
    );
  },
);
