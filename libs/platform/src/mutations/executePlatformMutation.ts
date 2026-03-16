import type { Knex } from 'knex';
import { redactSensitivePayload } from '../audit/redaction';

export interface PlatformMutationEvent {
  tenantId: string;
  actorId?: string | null;
  eventName: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  occurredAtUtc?: Date | string;
}

export interface ExecutePlatformMutationOptions<T> {
  mutation: (trx: Knex.Transaction) => Promise<T>;
  event:
    | PlatformMutationEvent
    | PlatformMutationEvent[]
    | ((result: T) => PlatformMutationEvent | PlatformMutationEvent[]);
}

const isNonEmpty = (value: string | undefined | null): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined | null): value is string => {
  return isNonEmpty(value) && UUID_PATTERN.test(value);
};

const assertValidEvent = (event: PlatformMutationEvent): PlatformMutationEvent => {
  if (!event || !isNonEmpty(event.tenantId) || !isNonEmpty(event.eventName) || !isNonEmpty(event.entityType) || !isNonEmpty(event.entityId)) {
    throw new Error('Mutation contract violation: tenantId, eventName, entityType, and entityId are required');
  }

  if (!isUuid(event.tenantId) || !isUuid(event.entityId) || (event.actorId != null && !isUuid(event.actorId))) {
    throw new Error('Mutation contract violation: tenantId, entityId, and actorId (if present) must be UUIDs');
  }

  return event;
};

const resolveEvents = <T>(eventInput: ExecutePlatformMutationOptions<T>['event'], result: T): PlatformMutationEvent[] => {
  const resolved = typeof eventInput === 'function' ? eventInput(result) : eventInput;
  const events = Array.isArray(resolved) ? resolved : [resolved];

  if (events.length === 0) {
    throw new Error('Mutation contract violation: at least one event is required');
  }

  return events.map(assertValidEvent);
};

export async function executePlatformMutation<T>(
  options: ExecutePlatformMutationOptions<T>,
  knexClient: Knex
): Promise<T> {
  return knexClient.transaction(async (trx) => {
    const result = await options.mutation(trx);
    const events = resolveEvents(options.event, result);

    for (const event of events) {
      const occurredAtUtc = event.occurredAtUtc ?? trx.fn.now();
      const payload = redactSensitivePayload(event.payload ?? {}).redactedPayload as Record<string, unknown>;

      const insertedEvents = await trx
        .withSchema('platform')
        .table('events')
        .insert({
          tenant_id: event.tenantId,
          actor_id: event.actorId ?? null,
          event_name: event.eventName,
          entity_type: event.entityType,
          entity_id: event.entityId,
          occurred_at_utc: occurredAtUtc,
          payload,
        })
        .returning(['id']);

      const eventId = insertedEvents?.[0]?.id;
      if (!isNonEmpty(eventId)) {
        throw new Error('Mutation contract violation: event write did not return an id');
      }

      const insertedOutboxEvents = await trx
        .withSchema('platform')
        .table('outbox_events')
        .insert({
          event_id: eventId,
          tenant_id: event.tenantId,
          event_name: event.eventName,
          entity_type: event.entityType,
          entity_id: event.entityId,
          occurred_at_utc: occurredAtUtc,
          payload,
          delivery_status: 'pending',
          delivery_attempts: 0,
          available_at_utc: occurredAtUtc,
        })
        .returning(['id']);

      const outboxId = insertedOutboxEvents?.[0]?.id;
      if (!isNonEmpty(outboxId)) {
        throw new Error('Mutation contract violation: outbox write did not return an id');
      }
    }

    return result;
  });
}
