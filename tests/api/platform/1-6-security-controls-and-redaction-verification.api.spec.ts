import { readFileSync } from 'node:fs';
import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/securityControlsStory16.fixture';
import {
  createCookiePolicyProbe,
  type EnvironmentName,
} from '../../support/factories/csrfCookiePolicyFactory';
import {
  createStory16Context,
  createStory16TenantHeaders,
} from '../../support/factories/securityControlsStory16Factory';

test.describe('Story 1.6 automate - security controls and redaction verification API coverage', () => {
  test('[P0] rejects cross-tenant read overrides on protected repository diagnostics @P0', async ({
    request,
    story16TenantHeaders,
    story16CrossTenantReadProbe,
  }) => {
    const response = await apiRequest(request, {
      method: 'GET',
      path: "/api/v1/platform/_kernel/tenancy/repository-check" + story16CrossTenantReadProbe.query,
      headers: story16TenantHeaders,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  test('[P0] rejects cross-tenant write overrides with deterministic business refusal envelope @P0', async ({
    request,
    story16TenantHeaders,
    story16CrossTenantWriteProbe,
  }) => {
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
  });

  test('[P1] rejects spoofed active-tenant header values that diverge from canonical tenancy context @P1', async ({
    request,
    story16Context,
    story16TenantHeaders,
  }) => {
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers: {
        ...story16TenantHeaders,
        'x-active-tenant-id': story16Context.crossTenantId,
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  test('[P1] rejects spoofed active-org-unit header values on orgUnit-scoped repository diagnostics @P1', async ({
    request,
  }) => {
    const orgScopedContext = createStory16Context({
      orgUnitId: 'story16-org-canonical',
      correlationId: 'corr-story16-org-scope',
    });
    const orgScopedHeaders = createStory16TenantHeaders(orgScopedContext, {
      orgUnitId: 'story16-org-canonical',
      role: 'ORGUNIT_MEMBER',
    });

    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers: {
        ...orgScopedHeaders,
        'x-active-org-unit-id': 'story16-org-spoofed',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  test('[P0] enforces csrf evidence on state-changing security guard endpoints when header proof is missing @P0', async ({
    request,
    story16CsrfGuardProbe,
  }) => {
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
  });

  test('[P1] accepts state-changing security guard requests when csrf header and proof token match @P1', async ({
    request,
    story16CsrfGuardProbe,
  }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/security/csrf/guard',
      headers: story16CsrfGuardProbe.headers,
      data: story16CsrfGuardProbe.payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'CSRF_GUARD_PASSED',
      data: {
        action: story16CsrfGuardProbe.payload.action,
      },
    });
  });

  test('[P1] rejects csrf mismatch with deterministic security refusal semantics @P1', async ({
    request,
    story16CsrfGuardProbe,
  }) => {
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
  });

  test('[P1] enforces csrf protection on auth logout path when csrf header proof is missing @P1', async ({
    request,
    story16TenantHeaders,
  }) => {
    const headers = { ...story16TenantHeaders };
    delete headers['x-csrf-token'];

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      code: 'CSRF_TOKEN_REQUIRED',
      refusalType: 'security',
    });
  });

  test('[P1] allows auth logout path when csrf cookie/header proof matches @P1', async ({
    request,
    story16TenantHeaders,
  }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/auth/logout',
      headers: story16TenantHeaders,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Logged out successfully',
    });
  });

  (['development', 'production'] as EnvironmentName[]).forEach((environment) => {
    test('[P1] validates ' + environment + ' cookie policy matrix for sibling app/api domains @P1', async ({
      request,
      story16Context,
    }) => {
      const cookiePolicyProbe = createCookiePolicyProbe({
        environment,
        tenantId: story16Context.tenantId,
        correlationId: story16Context.correlationId,
        csrfToken: story16Context.csrfToken,
      });

      const response = await apiRequest(request, {
        method: 'POST',
        path: '/api/v1/platform/_kernel/security/cookies/policy/evaluate',
        headers: cookiePolicyProbe.headers,
        data: cookiePolicyProbe.payload,
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toMatchObject({
        ok: true,
        policy: {
          environment: cookiePolicyProbe.expected.environment,
          parentDomain: cookiePolicyProbe.expected.parentDomain,
          accessToken: {
            httpOnly: true,
            secure: cookiePolicyProbe.expected.secure,
            sameSite: cookiePolicyProbe.expected.sameSite,
            domain: cookiePolicyProbe.expected.parentDomain,
          },
          refreshToken: {
            httpOnly: true,
            secure: cookiePolicyProbe.expected.secure,
            sameSite: cookiePolicyProbe.expected.sameSite,
            domain: cookiePolicyProbe.expected.parentDomain,
          },
        },
      });
    });
  });

  test('[P1] verifies redaction endpoint strips prohibited plaintext markers from audit payload contracts @P1', async ({
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
      data: {
        redaction: {
          allSensitiveFieldsRedacted: true,
          redactedFields: expect.arrayContaining(story16RedactionProbe.expected.redactedFields),
          preservedPaths: expect.arrayContaining(story16RedactionProbe.expected.preservedPaths),
        },
      },
    });

    const serialized = JSON.stringify(body);
    for (const marker of story16RedactionProbe.expected.forbiddenPlaintextMarkers) {
      expect(serialized).not.toContain(marker);
    }
  });

  test('[P1] keeps Story 1.6 security verification specs in required quality gate suites @P1', async () => {
    const qualityGateScript = readFileSync('scripts/quality-gates.sh', 'utf8');

    expect(qualityGateScript).toContain('api/platform/1-6-security-controls-and-redaction-verification.api.spec.ts');
    expect(qualityGateScript).toContain('e2e/platform/1-6-security-controls-and-redaction-verification.spec.ts');
  });
});
