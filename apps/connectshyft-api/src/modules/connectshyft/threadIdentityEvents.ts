import type {
  PersonProvisionalCreatedEvent,
  ResolverReviewCreatedEvent,
  SubjectContext,
} from '../../../../../libs/contracts/src';
import {
  validateEventEnvelope,
  validateSubjectContext,
} from '../../../../../libs/contracts/src';
import type { Knex } from 'knex';
import db from '../../config/knex';
import { redactSensitivePayload } from '../../../../../libs/platform/src/audit/redaction';

export interface PersistConnectShyftThreadIdentityEventInput {
  tenantId: string;
  orgUnitId: string;
  threadId: string;
  subject: SubjectContext;
  event:
    | PersonProvisionalCreatedEvent
    | ResolverReviewCreatedEvent;
}

export async function persistConnectShyftThreadIdentityEventAsync(
  input: PersistConnectShyftThreadIdentityEventInput,
): Promise<{
  eventId: string;
  outboxId: string;
}> {
  validateSubjectContext(input.subject);
  validateEventEnvelope(input.event);

  if (input.event.tenantId !== input.tenantId) {
    throw new Error('Identity event tenantId must match transport tenantId');
  }

  if (input.event.orgUnitId !== input.orgUnitId) {
    throw new Error('Identity event orgUnitId must match transport orgUnitId');
  }

  const occurredAtUtc = input.event.createdAt;
  const payload = redactSensitivePayload(
    input.event as unknown as Record<string, unknown>,
  ).redactedPayload as Record<string, unknown>;

  return db.transaction(async (trx: Knex.Transaction) => {
    const insertedEvents = await trx
      .withSchema('platform')
      .table('events')
      .insert({
        tenant_id: input.tenantId,
        actor_id: null,
        event_name: input.event.type,
        entity_type: 'connectshyft.thread',
        entity_id: input.threadId,
        occurred_at_utc: occurredAtUtc,
        payload,
      })
      .returning<{ id: string }[]>(['id']);

    const eventId = insertedEvents[0]?.id;
    if (!eventId) {
      throw new Error('Mutation contract violation: event write did not return an id');
    }

    const insertedOutbox = await trx
      .withSchema('platform')
      .table('outbox_events')
      .insert({
        event_id: eventId,
        tenant_id: input.tenantId,
        event_name: input.event.type,
        entity_type: 'connectshyft.thread',
        entity_id: input.threadId,
        occurred_at_utc: occurredAtUtc,
        payload,
        delivery_status: 'pending',
        delivery_attempts: 0,
        available_at_utc: occurredAtUtc,
      })
      .returning<{ id: string }[]>(['id']);

    const outboxId = insertedOutbox[0]?.id;
    if (!outboxId) {
      throw new Error('Mutation contract violation: outbox write did not return an id');
    }

    return {
      eventId,
      outboxId,
    };
  });
}
