import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createRepositoryGuardQuery,
  createCrossTenantProbe,
  createTenantScopeHeaders,
} from '../../support/factories/tenantRepositoryFactory';

test.describe('Story 0.2 ATDD RED - tenancy context and repository enforcement API coverage', () => {
  test.skip('[P0] requires tenant context before repository guard queries execute', async ({ request }) => {
    // Given no tenant context is supplied
    // When the tenancy diagnostics endpoint is queried
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
    });

    // Then protected data access is rejected deterministically
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANCY_CONTEXT_REQUIRED',
    });
  });

  test.skip('[P0] applies mandatory tenant filter to repository reads', async ({ request }) => {
    // Given a valid tenant context
    const tenantHeaders = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });
    const query = createRepositoryGuardQuery({
      resource: 'transactions',
      includeDiagnostics: true,
    });

    // When repository diagnostics are requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${query}`,
      headers: tenantHeaders,
    });

    // Then all returned rows are scoped to the resolved tenant
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.every((row: { tenantId: string }) => row.tenantId === 'tenant-alpha')).toBe(true);
  });

  test.skip('[P1] rejects cross-tenant query overrides from protected paths', async ({ request }) => {
    // Given a tenant-scoped request and a conflicting target tenant override
    const tenantHeaders = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });
    const crossTenantProbe = createCrossTenantProbe({
      sourceTenantId: 'tenant-alpha',
      targetTenantId: 'tenant-bravo',
      mode: 'read',
    });

    // When a cross-tenant read is attempted
    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${crossTenantProbe.query}`,
      headers: tenantHeaders,
    });

    // Then platform kernel rejects the request with deterministic refusal semantics
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
    });
  });

  test.skip('[P1] blocks cross-tenant writes when payload tenant differs from context tenant', async ({ request }) => {
    // Given a tenant-scoped request with mismatched payload tenant
    const tenantHeaders = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });
    const crossTenantProbe = createCrossTenantProbe({
      sourceTenantId: 'tenant-alpha',
      targetTenantId: 'tenant-bravo',
      mode: 'write',
    });

    // When the repository guard write contract is executed
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/tenancy/repository-check',
      headers: tenantHeaders,
      data: crossTenantProbe.payload,
    });

    // Then write is refused and includes structured refusal metadata
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
      refusalType: 'business',
    });
  });
});
