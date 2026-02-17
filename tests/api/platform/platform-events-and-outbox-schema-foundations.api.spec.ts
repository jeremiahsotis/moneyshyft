import { test, expect } from '@playwright/test';
import { apiRequest } from '../../support/helpers/apiClient';
import {
  createEventSchemaExpectation,
  createOperationalIndexExpectations,
  createOutboxSchemaExpectation,
  createPlatformContractHeaders,
} from '../../support/factories/platformEventOutboxFactory';

test.describe('Story 0.6 atdd - platform events and outbox schema foundations API coverage', () => {
  test.skip('returns canonical platform.events lineage schema contract @P0', async ({
    request,
  }) => {
    // Given platform lineage schema expectations for canonical event storage
    const headers = createPlatformContractHeaders({
      tenantId: 'tenant-platform-events-schema',
      correlationId: 'corr-platform-events-schema',
    });
    const eventSchemaExpectation = createEventSchemaExpectation();

    // When the events schema contract endpoint is called
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events/schema',
      headers,
    });

    // Then the response should expose required lineage fields
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      table: eventSchemaExpectation.tableName,
      requiredLineageFields: eventSchemaExpectation.requiredLineageFields,
    });
  });

  test.skip('returns canonical platform.outbox_events delivery schema contract @P0', async ({
    request,
  }) => {
    // Given outbox delivery schema expectations for integration-safe replay
    const headers = createPlatformContractHeaders({
      tenantId: 'tenant-platform-outbox-schema',
      correlationId: 'corr-platform-outbox-schema',
    });
    const outboxSchemaExpectation = createOutboxSchemaExpectation();

    // When the outbox schema contract endpoint is called
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/outbox/schema',
      headers,
    });

    // Then the response should expose required delivery and lineage fields
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      table: outboxSchemaExpectation.tableName,
      requiredDeliveryFields: outboxSchemaExpectation.requiredDeliveryFields,
    });
  });

  test.skip('returns operational and replay index contract metadata for events/outbox @P1', async ({
    request,
  }) => {
    // Given required index expectations for operational and replay queries
    const headers = createPlatformContractHeaders({
      tenantId: 'tenant-platform-indexes',
      correlationId: 'corr-platform-indexes',
    });
    const indexExpectations = createOperationalIndexExpectations();

    // When the index contract endpoint is called
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/events-outbox/indexes',
      headers,
    });

    // Then index definitions should include canonical operational and replay index names
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      events: indexExpectations.eventsIndexes,
      outbox: indexExpectations.outboxIndexes,
    });
  });

  test.skip('exposes replay cursor semantics for pending outbox delivery queries @P1', async ({
    request,
  }) => {
    // Given a replay query contract requiring status + available_at cursor semantics
    const headers = createPlatformContractHeaders({
      tenantId: 'tenant-platform-replay',
      correlationId: 'corr-platform-replay',
    });

    // When the replay contract endpoint is called
    const response = await apiRequest(request, {
      method: 'GET',
      path: '/api/v1/platform/_kernel/contracts/outbox/replay-query',
      headers,
    });

    // Then replay contract metadata should expose deterministic pagination/query keys
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      table: 'platform.outbox_events',
      queryKeys: ['delivery_status', 'available_at', 'outbox_event_id'],
      defaultOrder: ['available_at ASC', 'outbox_event_id ASC'],
    });
  });
});
