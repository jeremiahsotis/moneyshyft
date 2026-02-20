import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/securityControlsStory16.fixture';

test.describe('Story 1.6 Security Controls and Redaction Verification (ATDD E2E RED)', () => {
  test.skip(
    '[P1] operator verification journey surfaces tenant-scope and csrf control evidence in the security workspace @P1',
    async ({
      page,
      request,
      story16Context,
      story16TenantHeaders,
      story16CrossTenantReadProbe,
      story16CsrfGuardProbe,
    }) => {
      await page.goto(story16Context.securityDashboardPath);
      await page.getByRole('button', { name: 'Run Security Verification' }).click();

      const tenancyResponse = await apiRequest(request, {
        method: 'GET',
        path: `/api/v1/platform/_kernel/tenancy/repository-check${story16CrossTenantReadProbe.query}`,
        headers: story16TenantHeaders,
      });
      expect(tenancyResponse.status()).toBe(403);

      const csrfResponse = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/csrf/guard',
        headers: story16CsrfGuardProbe.headers,
        data: story16CsrfGuardProbe.payload,
      });
      expect([200, 403]).toContain(csrfResponse.status());

      await expect(
        page.getByRole('heading', { name: 'Security Controls Verification' }),
      ).toBeVisible();
      await expect(page.getByText('Tenant scope isolation')).toBeVisible();
      await expect(page.getByText('CSRF enforcement')).toBeVisible();
    },
  );

  test.skip(
    '[P1] security evidence panel displays redaction-safe telemetry without exposing plaintext secrets @P1',
    async ({ page, request, story16Context, story16TenantHeaders, story16RedactionProbe }) => {
      await page.goto(story16Context.securityDashboardPath);

      const response = await apiRequest(request, {
        method: 'POST',
        path: story16Context.redactionReportPath,
        headers: story16TenantHeaders,
        data: story16RedactionProbe.payload,
      });
      expect(response.status()).toBe(200);

      await expect(page.getByText('All sensitive fields are redacted')).toBeVisible();
      await expect(page.getByText('Audit payload is policy compliant')).toBeVisible();

      for (const marker of story16RedactionProbe.expected.forbiddenPlaintextMarkers) {
        await expect(page.getByText(marker)).toHaveCount(0);
      }
    },
  );
});
