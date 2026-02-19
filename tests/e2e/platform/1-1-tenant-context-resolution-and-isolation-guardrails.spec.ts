import { test, expect } from '../../support/fixtures/kernelApi.fixture';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createRepositoryGuardQuery,
  createCrossTenantProbe,
} from '../../support/factories/tenantRepositoryFactory';
import {
  createStory11TenantHeaders,
  tenantContextStory11,
} from '../../support/fixtures/tenantContextStory11.fixture';

test.describe('Story 1.1 automate - tenant context resolution and isolation guardrails journey', () => {
  test('[P0] keeps canonical tenant context stable across diagnostics and repository reads @P0', async ({
    request,
  }) => {
    const headers = createStory11TenantHeaders();
    const diagnosticsResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
      headers,
    });

    expect(diagnosticsResponse.status()).toBe(200);
    const diagnosticsBody = await diagnosticsResponse.json();
    expect(diagnosticsBody).toMatchObject({
      tenantId: tenantContextStory11.tenantId,
      orgUnitId: null,
      scopeMode: 'TENANT',
    });

    const repositoryResponse = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${createRepositoryGuardQuery({
        resource: 'accounts',
      })}`,
      headers,
    });

    expect(repositoryResponse.status()).toBe(200);
    const repositoryBody = await repositoryResponse.json();
    expect(repositoryBody).toMatchObject({
      context: {
        tenantId: tenantContextStory11.tenantId,
        orgUnitId: null,
        scopeMode: 'TENANT',
      },
      requiredFilters: {
        tenant_id: tenantContextStory11.tenantId,
      },
    });
  });

  test('[P0] denies anonymous diagnostics and repository-check requests with tenancy-context-required refusal @P0', async ({
    request,
  }) => {
    const diagnosticsResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
    });
    const repositoryResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
    });

    expect(diagnosticsResponse.status()).toBe(403);
    expect(repositoryResponse.status()).toBe(403);

    const diagnosticsBody = await diagnosticsResponse.json();
    const repositoryBody = await repositoryResponse.json();
    expect(diagnosticsBody.code).toBe('TENANCY_CONTEXT_REQUIRED');
    expect(repositoryBody.code).toBe('TENANCY_CONTEXT_REQUIRED');
  });

  test('[P1] rejects orgUnit spoofing attempts on guarded repository read journeys @P1', async ({
    request,
  }) => {
    const headers = {
      ...createStory11TenantHeaders(),
      'x-active-org-unit-id': tenantContextStory11.invalidOrgUnitId,
    };

    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers,
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
      refusalType: 'security',
    });
  });

  test('[P1] refuses cross-tenant repository reads when override target differs from canonical context @P1', async ({
    request,
  }) => {
    const headers = createStory11TenantHeaders();
    const crossTenantProbe = createCrossTenantProbe({
      sourceTenantId: tenantContextStory11.tenantId,
      targetTenantId: 'story11-tenant-cross',
      mode: 'read',
    });

    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${crossTenantProbe.query}`,
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

  test('[P1] blocks cross-orgUnit write attempts while preserving deterministic business refusal envelope @P1', async ({
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
