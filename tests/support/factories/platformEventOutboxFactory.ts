import { randomUUID } from 'node:crypto';

type PlatformContractHeaderOverrides = {
  tenantId?: string;
  correlationId?: string;
  csrfToken?: string;
};

type EventSchemaExpectationOverrides = {
  tableName?: string;
};

type OutboxSchemaExpectationOverrides = {
  tableName?: string;
};

export function createPlatformContractHeaders(
  overrides: PlatformContractHeaderOverrides = {},
): Record<string, string> {
  return {
    'x-tenant-id': overrides.tenantId ?? `tenant-${randomUUID()}`,
    'x-correlation-id': overrides.correlationId ?? `corr-${randomUUID()}`,
    'x-csrf-token': overrides.csrfToken ?? `csrf-${randomUUID()}`,
  };
}

export function createEventSchemaExpectation(
  overrides: EventSchemaExpectationOverrides = {},
) {
  return {
    tableName: overrides.tableName ?? 'platform.events',
    requiredLineageFields: [
      'event_id',
      'tenant_id',
      'aggregate_type',
      'aggregate_id',
      'event_type',
      'event_version',
      'occurred_at',
      'created_at',
      'payload',
      'metadata',
    ],
  };
}

export function createOutboxSchemaExpectation(
  overrides: OutboxSchemaExpectationOverrides = {},
) {
  return {
    tableName: overrides.tableName ?? 'platform.outbox_events',
    requiredDeliveryFields: [
      'outbox_event_id',
      'tenant_id',
      'event_id',
      'delivery_status',
      'available_at',
      'attempt_count',
      'last_error',
      'claimed_at',
      'delivered_at',
      'payload',
      'headers',
      'created_at',
      'updated_at',
    ],
  };
}

export function createOperationalIndexExpectations() {
  return {
    eventsIndexes: [
      'events_tenant_occurred_idx',
      'events_aggregate_lookup_idx',
    ],
    outboxIndexes: [
      'outbox_delivery_ready_idx',
      'outbox_replay_cursor_idx',
      'outbox_event_id_unique_idx',
    ],
  };
}
