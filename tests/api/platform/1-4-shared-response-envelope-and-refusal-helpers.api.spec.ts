import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStory14BusinessRefusalProbe,
  createStory14SharedEnvelopeHeaders,
  createStory14SuccessProbe,
  createStory14SystemErrorProbe,
} from '../../support/factories/sharedResponseEnvelopeStory14Factory';

test.describe('Story 1.4 automate - shared response envelope and refusal helpers API coverage', () => {
  test('[P0] emits canonical success envelope through shared serializer helpers @P0', async ({ request }) => {
    const headers = createStory14SharedEnvelopeHeaders({
      tenantId: 'tenant-story-1-4-success',
      correlationId: 'corr-story-1-4-success',
    });
    const successProbe = createStory14SuccessProbe();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/success',
      headers,
      data: successProbe.payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: successProbe.expected.code,
      message: successProbe.expected.message,
      correlationId: headers['x-correlation-id'],
      tenantId: null,
    });
  });

  test('[P0] keeps business refusals as HTTP 200 with ok=false @P0', async ({ request }) => {
    const headers = createStory14SharedEnvelopeHeaders({
      tenantId: 'tenant-story-1-4-refusal',
      correlationId: 'corr-story-1-4-refusal',
    });
    const refusalProbe = createStory14BusinessRefusalProbe();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal',
      headers,
      data: refusalProbe.payload,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: refusalProbe.expected.code,
      message: refusalProbe.expected.message,
      refusalType: refusalProbe.expected.refusalType,
      correlationId: headers['x-correlation-id'],
      tenantId: null,
    });
  });

  test('[P1] emits canonical system error envelope without stack leakage @P1', async ({ request }) => {
    const headers = createStory14SharedEnvelopeHeaders({
      tenantId: 'tenant-story-1-4-system-error',
      correlationId: 'corr-story-1-4-system-error',
    });
    const systemErrorProbe = createStory14SystemErrorProbe();

    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
      headers,
      data: systemErrorProbe.payload,
    });

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: systemErrorProbe.expected.code,
      message: systemErrorProbe.expected.message,
      correlationId: headers['x-correlation-id'],
      tenantId: null,
      errorType: 'system',
    });
    expect(body).not.toHaveProperty('stack');
  });

  test('[P1] keeps canonical top-level envelope keys across success, refusal, and system error paths @P1', async ({ request }) => {
    const headers = createStory14SharedEnvelopeHeaders({
      tenantId: 'tenant-story-1-4-envelope-keys',
      correlationId: 'corr-story-1-4-envelope-keys',
    });

    const successResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/success',
      headers,
      data: createStory14SuccessProbe().payload,
    });
    const refusalResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/business-refusal',
      headers,
      data: createStory14BusinessRefusalProbe().payload,
    });
    const systemErrorResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/envelope/response-matrix/system-error',
      headers,
      data: createStory14SystemErrorProbe().payload,
    });

    expect(successResponse.status()).toBe(200);
    expect(refusalResponse.status()).toBe(200);
    expect(systemErrorResponse.status()).toBe(500);

    const successBody = await successResponse.json();
    const refusalBody = await refusalResponse.json();
    const systemErrorBody = await systemErrorResponse.json();
    const requiredKeys = ['ok', 'code', 'message', 'correlationId', 'tenantId'];

    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(successBody, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key))).toBe(true);
    expect(requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(systemErrorBody, key))).toBe(true);
    expect(systemErrorBody.errorType).toBe('system');
  });
});
