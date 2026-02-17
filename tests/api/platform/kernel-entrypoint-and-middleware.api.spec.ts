import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import { createKernelRequest } from '../../support/factories/kernelRequestFactory';

test.describe('Story 0.1 automate - kernel entrypoint and middleware API coverage', () => {
  test('rejects context endpoint request without tenant context @P1', async ({ request }) => {
    // Given no tenant context header is provided
    // When calling the kernel context endpoint
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/context',
    });

    // Then tenancy middleware should reject the request
    expect(response.status()).toBe(400);
  });

  test('preserves supplied correlation id for traceability @P1', async ({ request }) => {
    // Given a request with explicit correlation and tenant context
    const kernelRequest = createKernelRequest({
      correlationId: 'correlation-story-0-1',
      tenantId: 'tenant-story-0-1',
    });

    // When the context endpoint is requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/context',
      headers: kernelRequest.headers,
    });

    // Then middleware should echo the correlation id in response headers
    expect(response.headers()['x-correlation-id']).toBe('correlation-story-0-1');
  });

  test('exposes canonical middleware sequence for kernel diagnostics @P1', async ({ request }) => {
    // Given a valid kernel request context
    const kernelRequest = createKernelRequest({ tenantId: 'tenant-story-0-1' });

    // When middleware order diagnostics are requested
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/middleware-order',
      headers: kernelRequest.headers,
    });

    // Then the returned order should include required platform layers
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.middleware)).toBe(true);
    expect(body.middleware).toEqual(
      expect.arrayContaining(['correlation', 'tenancy', 'auth-context', 'envelope']),
    );
  });

  test('registers module route collection through centralized registrar @P2', async ({ request }) => {
    // Given a kernel diagnostic route exposing registration metadata
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/routes',
    });

    // Then at least one module namespace should be listed
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.modules)).toBe(true);
    expect(body.modules.length).toBeGreaterThan(0);
  });
});
