import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/sharedApiEnvelope.fixture';

test.describe('Story 0.5 atdd - shared API envelope and business refusal contract journey', () => {
  test('keeps HTTP 200 semantics for business refusals in journey flow @P0', async ({
    request,
    sharedEnvelopeHeaders,
    businessRefusalProbe,
  }) => {
    // Given a browser-driven journey that triggers a business refusal contract path
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers: sharedEnvelopeHeaders,
      data: businessRefusalProbe.payload,
    });

    // Then refusal is represented as a business contract (HTTP 200 + ok=false)
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: businessRefusalProbe.expected.code,
      message: businessRefusalProbe.expected.message,
      refusalType: businessRefusalProbe.expected.refusalType,
    });
  });

  test('echoes correlation id consistently across success and refusal envelope paths @P1', async ({
    request,
    sharedEnvelopeHeaders,
    sharedSuccessProbe,
    businessRefusalProbe,
  }) => {
    // Given one request correlation context across multiple contract paths
    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/success',
      headers: sharedEnvelopeHeaders,
      data: sharedSuccessProbe.payload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers: sharedEnvelopeHeaders,
      data: businessRefusalProbe.payload,
    });

    // Then both responses should preserve the same correlation id
    expect(successResponse.status()).toBe(200);
    expect(refusalResponse.status()).toBe(200);

    const successBody = await successResponse.json();
    const refusalBody = await refusalResponse.json();

    expect(successBody.correlationId).toBe(sharedEnvelopeHeaders['x-correlation-id']);
    expect(refusalBody.correlationId).toBe(sharedEnvelopeHeaders['x-correlation-id']);
  });

  test('exposes structured refusal fields for downstream UI adapters @P1', async ({
    request,
    sharedEnvelopeHeaders,
    businessRefusalProbe,
  }) => {
    // Given a refusal scenario used by downstream UI adapters
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/business-refusal',
      headers: sharedEnvelopeHeaders,
      data: businessRefusalProbe.payload,
    });

    // Then response contains deterministic contract fields for rendering and localization
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toMatchObject({
      ok: false,
      code: businessRefusalProbe.expected.code,
      message: businessRefusalProbe.expected.message,
      refusalType: businessRefusalProbe.expected.refusalType,
    });
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });
});
