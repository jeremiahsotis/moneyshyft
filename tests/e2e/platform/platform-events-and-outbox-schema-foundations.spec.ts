import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/platformEventOutbox.fixture';

test.describe('Story 0.6 atdd - platform events and outbox schema foundations journey', () => {
  test.skip('returns schema contracts for events and outbox in one integration-safe journey @P0', async ({
    request,
    platformContractHeaders,
    eventSchemaExpectation,
    outboxSchemaExpectation,
  }) => {
    // Given a single integration context for schema contract discovery
    const eventsResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events/schema',
      headers: platformContractHeaders,
    });
    const outboxResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/outbox/schema',
      headers: platformContractHeaders,
    });

    // Then both canonical schema contracts should be published
    expect(eventsResponse.status()).toBe(200);
    expect(outboxResponse.status()).toBe(200);

    const eventsBody = await eventsResponse.json();
    const outboxBody = await outboxResponse.json();

    expect(eventsBody).toMatchObject({
      table: eventSchemaExpectation.tableName,
    });
    expect(outboxBody).toMatchObject({
      table: outboxSchemaExpectation.tableName,
    });
  });

  test.skip('keeps correlation metadata stable across schema and index contract endpoints @P1', async ({
    request,
    platformContractHeaders,
  }) => {
    // Given one correlation id across schema and index requests
    const eventsSchemaResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events/schema',
      headers: platformContractHeaders,
    });
    const indexesResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events-outbox/indexes',
      headers: platformContractHeaders,
    });

    // Then all contract responses should preserve caller correlation id
    expect(eventsSchemaResponse.status()).toBe(200);
    expect(indexesResponse.status()).toBe(200);

    const schemaBody = await eventsSchemaResponse.json();
    const indexesBody = await indexesResponse.json();
    const correlationId = platformContractHeaders['x-correlation-id'];

    expect(schemaBody.correlationId).toBe(correlationId);
    expect(indexesBody.correlationId).toBe(correlationId);
  });

  test.skip('exposes replay-ready outbox index hints for operator tooling adapters @P1', async ({
    request,
    platformContractHeaders,
    operationalIndexExpectations,
  }) => {
    // Given an operator adapter requesting replay index contract metadata
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events-outbox/indexes',
      headers: platformContractHeaders,
    });

    // Then outbox replay indexes should be explicit and deterministic
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.outbox).toEqual(operationalIndexExpectations.outboxIndexes);
  });

  test.skip('aligns replay-query cursor semantics with published outbox index hints @P1', async ({
    request,
    platformContractHeaders,
    operationalIndexExpectations,
  }) => {
    // Given one operator context consuming both indexes and replay query metadata
    const indexesResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events-outbox/indexes',
      headers: platformContractHeaders,
    });
    const replayQueryResponse = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/outbox/replay-query',
      headers: platformContractHeaders,
    });

    // Then replay cursor keys should align with replay-oriented outbox indexes
    expect(indexesResponse.status()).toBe(200);
    expect(replayQueryResponse.status()).toBe(200);

    const indexesBody = await indexesResponse.json();
    const replayBody = await replayQueryResponse.json();

    expect(indexesBody.outbox).toEqual(operationalIndexExpectations.outboxIndexes);
    expect(replayBody.queryKeys).toEqual([
      'delivery_status',
      'available_at',
      'outbox_event_id',
    ]);
    expect(replayBody.defaultOrder).toEqual([
      'available_at ASC',
      'outbox_event_id ASC',
    ]);
  });
});
