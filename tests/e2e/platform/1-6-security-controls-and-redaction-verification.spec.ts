import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/securityControlsStory16.fixture';
import {
  createCookiePolicyProbe,
  type EnvironmentName,
} from '../../support/factories/csrfCookiePolicyFactory';

test.describe('Story 1.6 automate - security controls and redaction verification journey coverage', () => {
  test('[P0] operator security verification journey confirms cross-tenant guardrails block read and write override attempts @P0', async ({
    request,
    story16TenantHeaders,
    story16CrossTenantReadProbe,
    story16CrossTenantWriteProbe,
  }) => {
    const readResponse = await apiRequest(request, {
      method: 'GET',
      path: "/api/v1/platform/_kernel/tenancy/repository-check" + story16CrossTenantReadProbe.query,
      headers: story16TenantHeaders,
    });

    const writeResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/tenancy/repository-check',
      headers: story16TenantHeaders,
      data: story16CrossTenantWriteProbe.payload,
    });

    expect(readResponse.status()).toBe(403);
    expect(writeResponse.status()).toBe(200);

    const readBody = await readResponse.json();
    const writeBody = await writeResponse.json();

    expect(readBody).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
    expect(writeBody).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'business',
    });
  });

  test('[P1] operator journey validates csrf acceptance and sibling-domain cookie posture contracts @P1', async ({
    request,
    story16Context,
    story16CsrfGuardProbe,
  }) => {
    const csrfResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: story16CsrfGuardProbe.headers,
      data: story16CsrfGuardProbe.payload,
    });

    expect(csrfResponse.status()).toBe(200);
    const csrfBody = await csrfResponse.json();
    expect(csrfBody).toMatchObject({
      ok: true,
      code: 'CSRF_GUARD_PASSED',
    });

    for (const environment of ['development', 'production'] as EnvironmentName[]) {
      const cookieProbe = createCookiePolicyProbe({
        environment,
        tenantId: story16Context.tenantId,
        correlationId: story16Context.correlationId,
        csrfToken: story16Context.csrfToken,
      });

      const cookieResponse = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/cookies/policy/evaluate',
        headers: cookieProbe.headers,
        data: cookieProbe.payload,
      });

      expect(cookieResponse.status()).toBe(200);
      const cookieBody = await cookieResponse.json();
      expect(cookieBody).toMatchObject({
        ok: true,
        policy: {
          environment,
          parentDomain: cookieProbe.expected.parentDomain,
          accessToken: {
            httpOnly: true,
            secure: cookieProbe.expected.secure,
            sameSite: cookieProbe.expected.sameSite,
            domain: cookieProbe.expected.parentDomain,
          },
          refreshToken: {
            httpOnly: true,
            secure: cookieProbe.expected.secure,
            sameSite: cookieProbe.expected.sameSite,
            domain: cookieProbe.expected.parentDomain,
          },
        },
      });
    }
  });

  test('[P1] operator journey validates redaction-safe evidence stream with no plaintext secret exposure @P1', async ({
    request,
    story16Context,
    story16TenantHeaders,
    story16RedactionProbe,
  }) => {
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
    });

    const serialized = JSON.stringify(body);
    for (const marker of story16RedactionProbe.expected.forbiddenPlaintextMarkers) {
      expect(serialized).not.toContain(marker);
    }
  });
});
