import { apiRequest } from '../../support/helpers/apiClient';
import {
  test,
  expect,
} from '../../support/fixtures/mutationTransactionWrapper.fixture';

test.describe('Story 0.7 atdd - mutation wrapper mandatory event/outbox journey', () => {
  test.skip('executes atomic mutation contract journey when domain, event, and outbox writes are present @P0', async ({
    request,
    mutationWrapperHeaders,
    atomicMutationProbe,
  }) => {
    // Given one caller context for full mutation transaction wrapper execution
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/atomic',
      headers: mutationWrapperHeaders,
      data: atomicMutationProbe.payload,
    });

    // Then atomic commit contract should confirm all required write categories persisted
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      code: atomicMutationProbe.expected.code,
      atomic: true,
      missingWrites: atomicMutationProbe.expected.missingWrites,
      correlationId: mutationWrapperHeaders['x-correlation-id'],
    });
  });

  test.skip('surfaces canonical refusal envelope when event write is absent in journey flow @P0', async ({
    request,
    mutationWrapperHeaders,
    missingEventProbe,
  }) => {
    // Given a mutation request missing event persistence
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes',
      headers: mutationWrapperHeaders,
      data: missingEventProbe.payload,
    });

    // Then the response should be a deterministic business refusal with explicit missing write
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: missingEventProbe.expected.code,
      message: missingEventProbe.expected.message,
      refusalType: missingEventProbe.expected.refusalType,
      missingWrites: missingEventProbe.expected.missingWrites,
    });
  });

  test.skip('surfaces canonical refusal envelope when outbox write is absent in journey flow @P0', async ({
    request,
    mutationWrapperHeaders,
    missingOutboxProbe,
  }) => {
    // Given a mutation request missing outbox persistence
    const response = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes',
      headers: mutationWrapperHeaders,
      data: missingOutboxProbe.payload,
    });

    // Then the response should be a deterministic business refusal with explicit missing write
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: false,
      code: missingOutboxProbe.expected.code,
      message: missingOutboxProbe.expected.message,
      refusalType: missingOutboxProbe.expected.refusalType,
      missingWrites: missingOutboxProbe.expected.missingWrites,
    });
  });

  test.skip('keeps correlation metadata stable across missing-event and missing-outbox refusal paths @P1', async ({
    request,
    mutationWrapperHeaders,
    missingEventProbe,
    missingOutboxProbe,
  }) => {
    // Given one correlation context reused across both refusal scenarios
    const missingEventResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes',
      headers: mutationWrapperHeaders,
      data: missingEventProbe.payload,
    });
    const missingOutboxResponse = await apiRequest(request, {
      method: 'POST',
      path: '/api/v1/platform/_kernel/contracts/mutation/transaction-wrapper/validate-required-writes',
      headers: mutationWrapperHeaders,
      data: missingOutboxProbe.payload,
    });

    // Then both refusal envelopes should preserve correlation and identify distinct missing writes
    expect(missingEventResponse.status()).toBe(200);
    expect(missingOutboxResponse.status()).toBe(200);

    const missingEventBody = await missingEventResponse.json();
    const missingOutboxBody = await missingOutboxResponse.json();

    expect(missingEventBody.correlationId).toBe(
      mutationWrapperHeaders['x-correlation-id'],
    );
    expect(missingOutboxBody.correlationId).toBe(
      mutationWrapperHeaders['x-correlation-id'],
    );
    expect(missingEventBody.missingWrites).toEqual(
      missingEventProbe.expected.missingWrites,
    );
    expect(missingOutboxBody.missingWrites).toEqual(
      missingOutboxProbe.expected.missingWrites,
    );
  });
});
