import { test, expect } from '../../support/fixtures/kernelApi.fixture';
import {
  createCrossTenantProbe,
  createTenantScopeHeaders,
} from '../../support/factories/tenantRepositoryFactory';

test.describe('Story 0.2 ATDD RED - tenancy context and repository enforcement journey', () => {
  test.skip('[P0] resolves stable tenant context for protected repository diagnostics journey', async ({
    request,
    kernelRequest,
  }) => {
    // Given a kernel request with tenant context
    // When the kernel context endpoint is called
    const contextResponse = await request.get('/api/v1/platform/_kernel/context', {
      headers: kernelRequest.headers,
    });

    // Then resolved tenant context must be present for downstream repository paths
    expect(contextResponse.status()).toBe(200);
    expect(contextResponse.headers()['x-tenant-id']).toBe(kernelRequest.tenantId);

    // And repository diagnostics inherit the same tenant scope
    const guardResponse = await request.get('/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions', {
      headers: kernelRequest.headers,
    });

    expect(guardResponse.status()).toBe(200);
    const guardBody = await guardResponse.json();
    expect(guardBody.context.tenantId).toBe(kernelRequest.tenantId);
  });

  test.skip('[P1] denies cross-tenant read attempts deterministically in end-to-end flow', async ({ request }) => {
    // Given tenant-alpha session context
    const headers = createTenantScopeHeaders({ tenantId: 'tenant-alpha' });
    const crossTenantProbe = createCrossTenantProbe({
      sourceTenantId: 'tenant-alpha',
      targetTenantId: 'tenant-bravo',
      mode: 'read',
    });

    // When cross-tenant diagnostics are requested
    const response = await request.get(`/api/v1/platform/_kernel/tenancy/repository-check${crossTenantProbe.query}`, {
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

  test.skip('[P1] keeps tenant scope consistent across repeated guarded requests', async ({ request }) => {
    // Given a valid tenant context for repeated requests
    const headers = createTenantScopeHeaders({ tenantId: 'tenant-repeat' });

    // When two guarded reads run in sequence
    const first = await request.get('/api/v1/platform/_kernel/tenancy/repository-check?resource=accounts', {
      headers,
    });
    const second = await request.get('/api/v1/platform/_kernel/tenancy/repository-check?resource=transactions', {
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
});
