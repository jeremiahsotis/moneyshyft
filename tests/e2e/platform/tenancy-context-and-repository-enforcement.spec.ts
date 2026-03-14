import { test, expect } from '../../support/fixtures/kernelApi.fixture';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createCrossTenantProbe,
  createTenantScopeHeaders,
} from '../../support/factories/tenantRepositoryFactory';

test.describe('Story 0.2 automate - tenancy context and repository enforcement journey', () => {
  test('resolves stable canonical tenant context for protected repository diagnostics journey @P0', async ({
    request,
  }) => {
    // Given an authenticated tenant context
    const headers = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });

    // When tenancy diagnostics are called
    const diagnosticsResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/diagnostics',
      headers,
    });

    // Then canonical context is returned from session claims
    expect(diagnosticsResponse.status()).toBe(200);
    const diagnosticsBody = await diagnosticsResponse.json();
    expect(diagnosticsBody.tenantId).toBe('tenant-alpha');
    expect(diagnosticsBody.scopeMode).toBe('TENANT');

    // And repository diagnostics inherit the same canonical tenant scope
    const guardResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers,
    });

    expect(guardResponse.status()).toBe(200);
    const guardBody = await guardResponse.json();
    expect(guardBody.context.tenantId).toBe('tenant-alpha');
  });

  test('denies cross-tenant read attempts deterministically in end-to-end flow @P1', async ({ request }) => {
    // Given tenant-alpha session context
    const headers = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });
    const crossTenantProbe = createCrossTenantProbe({
      sourceTenantId: 'tenant-alpha',
      targetTenantId: 'tenant-bravo',
      mode: 'read',
    });

    // When cross-tenant diagnostics are requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: `/api/v1/platform/_kernel/tenancy/repository-check${crossTenantProbe.query}`,
      headers,
    });

    // Then deterministic refusal envelope is returned
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'TENANT_SCOPE_VIOLATION',
    });
  });

  test('keeps tenant scope consistent across repeated guarded requests @P1', async ({ request }) => {
    // Given a valid tenant context for repeated requests
    const headers = createTenantScopeHeaders({ tenantId: 'tenant-repeat' });

    // When two guarded reads run in sequence
    const first = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=accounts',
      headers,
    });
    const second = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers,
    });

    // Then both responses preserve the same tenant context
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.context.tenantId).toBe('tenant-repeat');
    expect(secondBody.context.tenantId).toBe('tenant-repeat');
  });

  test('rejects spoofed orgunit context attempts deterministically @P1', async ({ request }) => {
    // Given a tenant-scoped authenticated request with a spoofed active orgUnit header
    const headers = {
      ...createTenantScopeHeaders({ tenantId: 'tenant-alpha', orgUnitId: null }),
      'x-active-org-unit-id': 'org-spoofed',
    };

    // When a protected repository path is called
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions',
      headers,
    });

    // Then deterministic orgUnit spoof protection rejects the request
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: 'ORG_UNIT_SCOPE_VIOLATION',
    });
  });
});
