import { expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import { test as story14Test } from '../../support/fixtures/sharedResponseEnvelopeStory14.fixture';

test.describe('Story 1.4 Shared Response Envelope and Refusal Helpers (ATDD E2E RED)', () => {
  story14Test.skip('[P1] journey-level refusal handling keeps deterministic contract semantics for consumers @P1', async ({
    page,
    request,
    story14SharedEnvelopeHeaders,
    story14BusinessRefusalProbe,
  }) => {
    await page.goto('/dashboard');

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
      refusalType: story14BusinessRefusalProbe.expected.refusalType,
      code: story14BusinessRefusalProbe.expected.code,
    });

    await expect(page.getByTestId('global-refusal-banner')).toContainText(story14BusinessRefusalProbe.expected.message);
  });

  story14Test.skip('[P1] journey-level system error path preserves shared envelope keys for client fallback rendering @P1', async ({
    page,
    request,
    story14SharedEnvelopeHeaders,
    story14SystemErrorProbe,
  }) => {
    await page.goto('/dashboard');

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

    await expect(page.getByTestId('global-system-error-banner')).toContainText(story14SystemErrorProbe.expected.message);
  });
});
