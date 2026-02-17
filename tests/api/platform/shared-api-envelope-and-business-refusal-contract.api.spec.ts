import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createBusinessRefusalProbe,
  createSharedEnvelopeHeaders,
  createSharedEnvelopeSuccessProbe,
} from '../../support/factories/sharedApiEnvelopeFactory';

test.describe('Story 0.5 atdd - shared API envelope and business refusal contract API coverage', () => {
  test('returns canonical success envelope using shared helper contract @P0', async ({ request }) => {
    // Given a valid platform request context and success probe payload
    const headers = createSharedEnvelopeHeaders({
      tenantId: 'tenant-envelope-alpha',
      correlationId: 'corr-envelope-alpha',
    });
    const successProbe = createSharedEnvelopeSuccessProbe();

    // When the shared success envelope contract endpoint is called
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/success',
      headers,
      data: successProbe.payload,
    });

    // Then a structured shared success envelope contract is returned
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: successProbe.expected.code,
      message: successProbe.expected.message,
      correlationId: headers['x-correlation-id'],
      tenantId: headers['x-tenant-id'],
    });
  });

  test('returns business refusal contract as HTTP 200 with structured code/message @P0', async ({ request }) => {
    // Given a request that should violate a business envelope rule
    const headers = createSharedEnvelopeHeaders({
      tenantId: 'tenant-envelope-alpha',
      correlationId: 'corr-envelope-refusal-alpha',
    });
    const refusalProbe = createBusinessRefusalProbe();

    // When the business refusal contract endpoint is called
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers,
      data: refusalProbe.payload,
    });

    // Then HTTP 200 is preserved with structured refusal semantics
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: refusalProbe.expected.code,
      message: refusalProbe.expected.message,
      refusalType: refusalProbe.expected.refusalType,
      correlationId: headers['x-correlation-id'],
      tenantId: headers['x-tenant-id'],
    });
  });

  test('keeps shared envelope shape consistent between success and business refusal contracts @P1', async ({ request }) => {
    // Given one request context reused across success and refusal probes
    const headers = createSharedEnvelopeHeaders({
      tenantId: 'tenant-envelope-consistency',
      correlationId: 'corr-envelope-consistency',
    });
    const successProbe = createSharedEnvelopeSuccessProbe();
    const refusalProbe = createBusinessRefusalProbe();

    // When both contract endpoints are called
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/success',
      headers,
      data: successProbe.payload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers,
      data: refusalProbe.payload,
    });

    // Then they both emit the canonical top-level envelope contract keys
    expect(successResponse.status()).toBe(200);
    expect(refusalResponse.status()).toBe(200);

    const successBody = await successResponse.json();
    const refusalBody = await refusalResponse.json();
    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
  });

  test('keeps refusal envelopes deterministic and free of internal stack leakage @P1', async ({ request }) => {
    // Given a deterministic refusal probe payload
    const headers = createSharedEnvelopeHeaders({
      tenantId: 'tenant-envelope-hardening',
      correlationId: 'corr-envelope-hardening',
    });
    const refusalProbe = createBusinessRefusalProbe({
      code: 'ENVELOPE_BUSINESS_REFUSAL',
      message: 'Requested amount exceeds available envelope balance',
    });

    // When the refusal contract endpoint is called repeatedly with same input
    const firstResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers,
      data: refusalProbe.payload,
    });
    const secondResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers,
      data: refusalProbe.payload,
    });

    // Then structured refusal fields remain stable and implementation details are hidden
    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);

    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstBody).toMatchObject({
      ok: false,
      code: refusalProbe.expected.code,
      message: refusalProbe.expected.message,
      refusalType: 'business',
    });
    expect(secondBody).toMatchObject({
      ok: false,
      code: refusalProbe.expected.code,
      message: refusalProbe.expected.message,
      refusalType: 'business',
    });
    expect(firstBody).not.toHaveProperty('stack');
    expect(secondBody).not.toHaveProperty('stack');
  });
});
