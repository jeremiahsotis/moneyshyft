import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
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

    // Then repository probe evidence proves tenant scope filters are injected
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
    expect(body.rows).toEqual([]);
    expect(body.repositoryProbe).toMatchObject({
      resource: 'transactions',
      table: 'transactions',
    });
    expect(typeof body.repositoryProbe.sql).toBe('string');
    expect(body.repositoryProbe.sql.toLowerCase()).toContain('from');
    expect(body.repositoryProbe.sql.toLowerCase()).toContain('transactions');
    expect(body.repositoryProbe.sql.toLowerCase()).toContain('household_id');
    expect(Array.isArray(body.repositoryProbe.bindings)).toBe(true);
    expect(body.repositoryProbe.bindings).toEqual(
      expect.arrayContaining(['tenant-alpha'])
    );
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

  test('requires tenant membership before orgUnit-scoped diagnostics are allowed @P1', async ({ request }) => {
    // Given an orgUnit-scoped request for a synthetic tenant/user pair with no memberships
    const tenantId = randomUUID();
    const orgUnitId = randomUUID();
    const userId = randomUUID();
    const tenantHeaders = createTenantScopeHeaders({
      tenantId,
      orgUnitId,
      role: 'ORGUNIT_MEMBER',
      userId,
    });

    // When orgUnit-scoped diagnostics are requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
      headers: tenantHeaders,
    });

    // Then tenant membership is required before orgUnit diagnostics can proceed
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
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
