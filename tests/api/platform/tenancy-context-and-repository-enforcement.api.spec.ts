import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createRepositoryGuardQuery,
  createCrossTenantProbe,
  createTenantScopeHeaders,
} from '../../support/factories/tenantRepositoryFactory';

test.describe('Story 0.2 automate - tenancy context and repository enforcement API coverage', () => {
  test('requires authenticated non-public tenant context before repository guard queries execute @P0', async ({ request }) => {
    // Given no authenticated context is supplied
    // When the tenancy diagnostics endpoint is queried
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
    });

    // Then protected data access is rejected deterministically
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANCY_CONTEXT_REQUIRED',
    });
  });

  test('applies mandatory tenant filter to repository reads @P0', async ({ request }) => {
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
    expect(body.context).toMatchObject({
      tenantId: 'tenant-alpha',
      orgUnitId: null,
      scopeMode: 'TENANT',
    });
    expect(body.requiredFilters).toEqual({
      tenant_id: 'tenant-alpha',
    });
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.every((row: { tenantId: string }) => row.tenantId === 'tenant-alpha')).toBe(true);
  });

  test('rejects cross-tenant query overrides from protected paths @P1', async ({ request }) => {
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

  test('rejects cross-orgunit read overrides from protected paths @P1', async ({ request }) => {
    // Given an orgUnit-scoped request and conflicting orgUnit override
    const tenantHeaders = createTenantScopeHeaders({
      tenantId: 'tenant-alpha',
      orgUnitId: 'org-alpha',
      role: 'ORGUNIT_MEMBER',
    });
    const crossOrgUnitProbe = createCrossTenantProbe({
      sourceTenantId: 'tenant-alpha',
      sourceOrgUnitId: 'org-alpha',
      targetTenantId: 'tenant-alpha',
      targetOrgUnitId: 'org-bravo',
      mode: 'read',
    });

    // When a cross-orgUnit read is attempted
    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${crossOrgUnitProbe.query}`,
      headers: tenantHeaders,
    });

    // Then the kernel deterministically rejects the override
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
    });
  });

  test('blocks cross-tenant writes when payload tenant differs from context tenant @P1', async ({ request }) => {
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

  test('blocks spoofed orgunit header attempts even when authenticated tenant context is valid @P1', async ({ request }) => {
    // Given a tenant-scoped authenticated request with spoofed orgUnit header
    const tenantHeaders = {
      ...createTenantScopeHeaders({ tenantId: 'tenant-alpha', orgUnitId: null }),
      'x-active-org-unit-id': 'org-spoofed',
    };

    // When repository diagnostics are requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers: tenantHeaders,
    });

    // Then spoofing is rejected deterministically
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
    });
  });
});
