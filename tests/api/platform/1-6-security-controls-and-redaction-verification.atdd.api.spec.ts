import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/securityControlsStory16.fixture';

test.describe('Story 1.6 Security Controls and Redaction Verification (ATDD API RED)', () => {
  test.skip(
    '[P0] rejects cross-tenant read overrides on protected repository diagnostics @P0',
    async ({ request, story16TenantHeaders, story16CrossTenantReadProbe }) => {
      const response = await apiRequest(request, {
        method: 'GET',
        path: `/api/v1/platform/_kernel/tenancy/repository-check${story16CrossTenantReadProbe.query}`,
        headers: story16TenantHeaders,
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'TENANT_SCOPE_VIOLATION',
        refusalType: 'security',
      });
    },
  );

  test.skip(
    '[P0] rejects cross-tenant write overrides with deterministic business refusal envelope @P0',
    async ({ request, story16TenantHeaders, story16CrossTenantWriteProbe }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/tenancy/repository-check',
        headers: story16TenantHeaders,
        data: story16CrossTenantWriteProbe.payload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'TENANT_SCOPE_VIOLATION',
        refusalType: 'business',
      });
    },
  );

  test.skip(
    '[P0] enforces csrf evidence on state-changing security guard endpoints @P0',
    async ({ request, story16CsrfGuardProbe }) => {
      const headers = { ...story16CsrfGuardProbe.headers };
      delete headers['x-csrf-token'];

      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/csrf/guard',
        headers,
        data: story16CsrfGuardProbe.payload,
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'CSRF_TOKEN_REQUIRED',
        refusalType: 'security',
      });
    },
  );

  test.skip(
    '[P1] rejects csrf mismatch and preserves deterministic security refusal semantics @P1',
    async ({ request, story16CsrfGuardProbe }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/csrf/guard',
        headers: {
          ...story16CsrfGuardProbe.headers,
          'x-csrf-token': 'csrf-mismatch-story-1-6',
        },
        data: story16CsrfGuardProbe.payload,
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: false,
        code: 'CSRF_TOKEN_INVALID',
        refusalType: 'security',
      });
    },
  );

  test.skip(
    '[P1] verifies production cookie posture contract for sibling app/api domains @P1',
    async ({ request, story16CookiePolicyProbe }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/cookies/policy/evaluate',
        headers: story16CookiePolicyProbe.headers,
        data: story16CookiePolicyProbe.payload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        policy: {
          environment: story16CookiePolicyProbe.expected.environment,
          parentDomain: story16CookiePolicyProbe.expected.parentDomain,
          accessToken: {
            httpOnly: true,
            secure: story16CookiePolicyProbe.expected.secure,
            sameSite: story16CookiePolicyProbe.expected.sameSite,
            domain: story16CookiePolicyProbe.expected.parentDomain,
          },
          refreshToken: {
            httpOnly: true,
            secure: story16CookiePolicyProbe.expected.secure,
            sameSite: story16CookiePolicyProbe.expected.sameSite,
            domain: story16CookiePolicyProbe.expected.parentDomain,
          },
        },
      });
    },
  );

  test.skip(
    '[P1] emits redaction-safe audit evidence and excludes plaintext secrets from payload contracts @P1',
    async ({ request, story16Context, story16TenantHeaders, story16RedactionProbe }) => {
      const response = await apiRequest(request, {
        method: 'POST',
        path: story16Context.redactionReportPath,
        headers: story16TenantHeaders,
        data: story16RedactionProbe.payload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        code: 'SECURITY_REDACTION_VERIFIED',
        data: {
          redaction: {
            allSensitiveFieldsRedacted: true,
            redactedFields: expect.arrayContaining(
              story16RedactionProbe.expected.redactedFields,
            ),
            preservedPaths: expect.arrayContaining(
              story16RedactionProbe.expected.preservedPaths,
            ),
          },
        },
      });

      const serialized = JSON.stringify(body);
      for (const marker of story16RedactionProbe.expected.forbiddenPlaintextMarkers) {
        expect(serialized).not.toContain(marker);
      }
    },
  );
});
