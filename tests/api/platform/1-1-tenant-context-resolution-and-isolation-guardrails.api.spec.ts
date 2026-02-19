import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import { createRepositoryGuardQuery } from '../../support/factories/tenantRepositoryFactory';
import {
  createStory11TenantHeaders,
  tenantContextStory11,
} from '../../support/fixtures/tenantContextStory11.fixture';

test.describe('Story 1.1 automate - tenant context resolution and isolation guardrails API coverage', () => {
  test('[P0] resolves canonical tenancy context for authenticated tenant-scoped diagnostics @P0', async ({
    request,
  }) => {
    const headers = createStory11TenantHeaders();

    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
      headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'TENANCY_DIAGNOSTICS_READY',
      tenantId: tenantContextStory11.tenantId,
      orgUnitId: null,
      scopeMode: 'TENANT',
    });
  });

  test('[P0] refuses tenancy diagnostics when protected scope context is missing @P0', async ({ request }) => {
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANCY_CONTEXT_REQUIRED',
      refusalType: 'security',
    });
  });

  test('[P1] enforces tenant-scoped repository read filters for guarded access @P1', async ({ request }) => {
    const headers = createStory11TenantHeaders();
    const query = createRepositoryGuardQuery({
      resource: 'transactions',
      includeDiagnostics: true,
    });

    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${query}`,
      headers,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: 'TENANT_SCOPE_APPLIED',
      context: {
        tenantId: tenantContextStory11.tenantId,
        orgUnitId: null,
        scopeMode: 'TENANT',
      },
      requiredFilters: {
        tenant_id: tenantContextStory11.tenantId,
      },
      repositoryProbe: {
        resource: 'transactions',
        table: 'transactions',
      },
    });
  });

  test('[P1] rejects spoofed active-tenant header overrides with deterministic security refusal @P1', async ({
    request,
  }) => {
    const headers = {
      ...createStory11TenantHeaders(),
      'x-active-tenant-id': 'story11-tenant-spoof',
    };

    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=accounts',
      headers,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  test('[P1] blocks cross-orgUnit write overrides with deterministic business refusal @P1', async ({
    request,
  }) => {
    const headers = createStory11TenantHeaders({
      orgUnitId: tenantContextStory11.orgUnitId,
      role: 'ORGUNIT_MEMBER',
    });

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/tenancy/repository-check',
      headers,
      data: {
        targetTenantId: tenantContextStory11.tenantId,
        targetOrgUnitId: tenantContextStory11.alternateOrgUnitId,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
      refusalType: 'business',
    });
  });
});
