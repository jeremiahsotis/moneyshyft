import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/sharedResponseEnvelopeStory14.fixture';

test.describe('Story 1.4 automate - shared response envelope and refusal helpers journey coverage', () => {
  test('[P1] journey path preserves business refusal semantics for downstream consumers @P1', async ({
    request,
    story14SharedEnvelopeHeaders,
    story14BusinessRefusalProbe,
  }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal',
      headers: story14SharedEnvelopeHeaders,
      data: story14BusinessRefusalProbe.payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story14BusinessRefusalProbe.expected.code,
      message: story14BusinessRefusalProbe.expected.message,
      refusalType: story14BusinessRefusalProbe.expected.refusalType,
      correlationId: story14SharedEnvelopeHeaders['x-correlation-id'],
    });
  });

  test('[P1] journey path preserves system error envelope keys without leaking implementation details @P1', async ({
    request,
    story14SharedEnvelopeHeaders,
    story14SystemErrorProbe,
  }) => {
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
      headers: story14SharedEnvelopeHeaders,
      data: story14SystemErrorProbe.payload,
    });

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: story14SystemErrorProbe.expected.code,
      message: story14SystemErrorProbe.expected.message,
      correlationId: story14SharedEnvelopeHeaders['x-correlation-id'],
    });
    expect(body).not.toHaveProperty('stack');
  });

  test('[P1] journey path keeps correlation context stable across refusal and system-error outcomes @P1', async ({
    request,
    story14SharedEnvelopeHeaders,
    story14BusinessRefusalProbe,
    story14SystemErrorProbe,
  }) => {
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal',
      headers: story14SharedEnvelopeHeaders,
      data: story14BusinessRefusalProbe.payload,
    });
    const systemErrorResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
      headers: story14SharedEnvelopeHeaders,
      data: story14SystemErrorProbe.payload,
    });

    const refusalBody = await refusalResponse.json();
    const systemErrorBody = await systemErrorResponse.json();

    expect(refusalResponse.status()).toBe(200);
    expect(systemErrorResponse.status()).toBe(500);
    expect(refusalBody.correlationId).toBe(story14SharedEnvelopeHeaders['x-correlation-id']);
    expect(systemErrorBody.correlationId).toBe(story14SharedEnvelopeHeaders['x-correlation-id']);
  });
});
