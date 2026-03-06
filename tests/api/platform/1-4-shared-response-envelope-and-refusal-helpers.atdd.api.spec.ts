import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createStory14BusinessRefusalProbe,
  createStory14SharedEnvelopeHeaders,
  createStory14SuccessProbe,
  createStory14SystemErrorProbe,
} from '../../support/factories/sharedResponseEnvelopeStory14Factory';

test.describe('Story 1.4 Shared Response Envelope and Refusal Helpers (ATDD API RED)', () => {
  test.skip('[P0] emits canonical success envelope contract through shared serializer helpers @P0', async ({ request }) => {
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

  test.skip('[P0] preserves refusal transport semantics (HTTP 200 + ok=false) for business outcomes @P0', async ({ request }) => {
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

  test.skip('[P1] emits canonical system error envelope without leaking internal stack details @P1', async ({ request }) => {
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
    });
    expect(body).not.toHaveProperty('stack');
  });
});
