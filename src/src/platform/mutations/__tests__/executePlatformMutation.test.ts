import type { Knex } from 'knex';
import { executePlatformMutation } from '../executePlatformMutation';
import { REDACTED_VALUE } from '../../audit/redaction';

type MutationRow = { id: string; value: string };
type PlatformEventRow = Record<string, unknown> & { id: string };
type OutboxRow = Record<string, unknown>;

function createFakeDb(options?: { failOutboxInsert?: boolean; eventInsertReturnsId?: boolean; outboxInsertReturnsId?: boolean }) {
  const state = {
    mutationRows: [] as MutationRow[],
    platformEvents: [] as PlatformEventRow[],
    outboxEvents: [] as OutboxRow[],
  };

  let txCounter = 0;

  const db: any = {
    fn: {
      now: () => new Date('2026-02-17T00:00:00.000Z').toISOString(),
    },
    transaction: async (callback: (trx: Knex.Transaction) => Promise<unknown>) => {
      const staged = {
        mutationRows: [...state.mutationRows],
        platformEvents: [...state.platformEvents],
        outboxEvents: [...state.outboxEvents],
      };

      const trx: any = (tableName: string) => {
        if (tableName !== 'kernel_mutation_rows') {
          throw new Error(`Unexpected table access: ${tableName}`);
        }

        return {
          insert(payload: { value: string }) {
            txCounter += 1;
            staged.mutationRows.push({ id: `mut-${txCounter}`, value: payload.value });
            return Promise.resolve([{ id: `mut-${txCounter}`, value: payload.value }]);
          },
        };
      };

      trx.fn = db.fn;
      trx.withSchema = (schemaName: string) => {
        if (schemaName !== 'platform') {
          throw new Error(`Unexpected schema: ${schemaName}`);
        }

        return {
          table: (tableName: string) => {
            if (tableName === 'events') {
              return {
                insert(payload: Record<string, unknown>) {
                  txCounter += 1;
                  const eventId = `evt-${txCounter}`;
                  staged.platformEvents.push({ id: eventId, ...payload });
                  return {
                    returning() {
                      if (options?.eventInsertReturnsId === false) {
                        return Promise.resolve([{}]);
                      }
                      return Promise.resolve([{ id: eventId }]);
                    },
                  };
                },
              };
            }

            if (tableName === 'outbox_events') {
              return {
                insert(payload: Record<string, unknown>) {
                  return {
                    async returning() {
                      if (options?.failOutboxInsert) {
                        throw new Error('Simulated outbox write failure');
                      }
                      staged.outboxEvents.push(payload);
                      if (options?.outboxInsertReturnsId === false) {
                        return [{}];
                      }
                      return [{ id: 'out-1' }];
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected platform table: ${tableName}`);
          },
        };
      };

      try {
        const result = await callback(trx);
        state.mutationRows = staged.mutationRows;
        state.platformEvents = staged.platformEvents;
        state.outboxEvents = staged.outboxEvents;
        return result;
      } catch (error) {
        throw error;
      }
    },
  };

  return { db: db as Knex, state };
}

describe('executePlatformMutation', () => {
  it('AC1: writes domain mutation + event + outbox atomically', async () => {
    const { db, state } = createFakeDb();

    const result = await executePlatformMutation(
      {
        mutation: async (trx) => {
          const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'accepted' });
          return inserted[0];
        },
        event: (mutationResult) => ({
          tenantId: '11111111-1111-4111-8111-111111111111',
          actorId: '22222222-2222-4222-8222-222222222222',
          eventName: 'kernel.mutation.accepted',
          entityType: 'kernel_mutation_row',
          entityId: '33333333-3333-4333-8333-333333333333',
          payload: { value: mutationResult.value },
        }),
      },
      db
    );

    expect(result).toEqual({ id: 'mut-1', value: 'accepted' });
    expect(state.mutationRows).toHaveLength(1);
    expect(state.platformEvents).toHaveLength(1);
    expect(state.outboxEvents).toHaveLength(1);
    expect(state.platformEvents[0].event_name).toBe('kernel.mutation.accepted');
    expect(state.outboxEvents[0].event_id).toBe(state.platformEvents[0].id);
    expect(state.outboxEvents[0].tenant_id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('AC1: rolls back domain write when outbox insert fails', async () => {
    const { db, state } = createFakeDb({ failOutboxInsert: true });

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'rollback-me' });
            return inserted[0];
          },
          event: {
            tenantId: '11111111-1111-4111-8111-111111111111',
            actorId: '22222222-2222-4222-8222-222222222222',
            eventName: 'kernel.mutation.rollback',
            entityType: 'kernel_mutation_row',
            entityId: '33333333-3333-4333-8333-333333333333',
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow('Simulated outbox write failure');

    expect(state.mutationRows).toHaveLength(0);
    expect(state.platformEvents).toHaveLength(0);
    expect(state.outboxEvents).toHaveLength(0);
  });

  it('AC1: redacts sensitive payload fields before persisting events and outbox records', async () => {
    const { db, state } = createFakeDb();

    await executePlatformMutation(
      {
        mutation: async (trx) => {
          const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'redaction-check' });
          return inserted[0];
        },
        event: {
          tenantId: '11111111-1111-4111-8111-111111111111',
          actorId: '22222222-2222-4222-8222-222222222222',
          eventName: 'kernel.mutation.redaction-check',
          entityType: 'kernel_mutation_row',
          entityId: '33333333-3333-4333-8333-333333333333',
          payload: {
            accessToken: 'plain-access-token',
            nested: {
              apiKey: 'plain-api-key',
            },
            sensitive: {
              opaqueValue: 'plain-sensitive-value',
            },
          },
        },
      },
      db
    );

    expect(state.platformEvents).toHaveLength(1);
    expect(state.outboxEvents).toHaveLength(1);
    expect(state.platformEvents[0].payload).toEqual({
      accessToken: REDACTED_VALUE,
      nested: {
        apiKey: REDACTED_VALUE,
      },
      sensitive: {
        opaqueValue: REDACTED_VALUE,
      },
    });
    expect(state.outboxEvents[0].payload).toEqual(state.platformEvents[0].payload);
    const serialized = JSON.stringify(state.platformEvents[0].payload);
    expect(serialized).not.toContain('plain-access-token');
    expect(serialized).not.toContain('plain-api-key');
    expect(serialized).not.toContain('plain-sensitive-value');
  });

  it('AC2: fails contract when mandatory event fields are missing', async () => {
    const { db } = createFakeDb();

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'no-event-metadata' });
            return inserted[0];
          },
          event: {
            tenantId: '11111111-1111-4111-8111-111111111111',
            eventName: '',
            entityType: 'kernel_mutation_row',
            entityId: '33333333-3333-4333-8333-333333333333',
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow('Mutation contract violation: tenantId, eventName, entityType, and entityId are required');
  });

  it('AC2: fails contract when event write does not return an id', async () => {
    const { db } = createFakeDb({ eventInsertReturnsId: false });

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'missing-id' });
            return inserted[0];
          },
          event: {
            tenantId: '11111111-1111-4111-8111-111111111111',
            eventName: 'kernel.mutation.missing-id',
            entityType: 'kernel_mutation_row',
            entityId: '33333333-3333-4333-8333-333333333333',
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow('Mutation contract violation: event write did not return an id');
  });

  it('AC2: fails contract when outbox write does not return an id', async () => {
    const { db } = createFakeDb({ outboxInsertReturnsId: false });

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'missing-outbox-id' });
            return inserted[0];
          },
          event: {
            tenantId: '11111111-1111-4111-8111-111111111111',
            eventName: 'kernel.mutation.missing-outbox-id',
            entityType: 'kernel_mutation_row',
            entityId: '33333333-3333-4333-8333-333333333333',
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow('Mutation contract violation: outbox write did not return an id');
  });

  it('AC2: fails contract when ids are not UUIDs', async () => {
    const { db } = createFakeDb();

    await expect(
      executePlatformMutation(
        {
          mutation: async (trx) => {
            const inserted = await (trx as any)('kernel_mutation_rows').insert({ value: 'invalid-ids' });
            return inserted[0];
          },
          event: {
            tenantId: 'house-1',
            actorId: 'user-1',
            eventName: 'kernel.mutation.invalid-ids',
            entityType: 'kernel_mutation_row',
            entityId: 'mut-1',
            payload: {},
          },
        },
        db
      )
    ).rejects.toThrow('Mutation contract violation: tenantId, entityId, and actorId (if present) must be UUIDs');
  });
});
