import { down, up } from '../20260217113000_create_platform_events_and_outbox';

type ColumnRecord = {
  type: string;
  args: any[];
  chain: {
    notNullable: boolean;
    defaultValue: any;
    references?: string;
    inTable?: string;
    onDelete?: string;
    isUnique: boolean;
    isPrimary: boolean;
  };
};

type TableRecord = {
  columns: Record<string, ColumnRecord>;
  indexes: Array<{ columns: string[]; indexName?: string }>;
};

function buildKnexMock() {
  const tables = new Map<string, TableRecord>();
  const dropped: string[] = [];

  const createTable = (fullTableName: string, callback: (table: any) => void) => {
    const record: TableRecord = { columns: {}, indexes: [] };

    const makeColumn = (columnName: string, type: string, args: any[]) => {
      const chainState = {
        notNullable: false,
        defaultValue: undefined,
        references: undefined as string | undefined,
        inTable: undefined as string | undefined,
        onDelete: undefined as string | undefined,
        isUnique: false,
        isPrimary: false,
      };

      const chain = {
        notNullable() {
          chainState.notNullable = true;
          return chain;
        },
        defaultTo(value: any) {
          chainState.defaultValue = value;
          return chain;
        },
        references(column: string) {
          chainState.references = column;
          return chain;
        },
        inTable(tableName: string) {
          chainState.inTable = tableName;
          return chain;
        },
        onDelete(action: string) {
          chainState.onDelete = action;
          return chain;
        },
        unique() {
          chainState.isUnique = true;
          return chain;
        },
        primary() {
          chainState.isPrimary = true;
          return chain;
        },
      };

      record.columns[columnName] = {
        type,
        args,
        chain: chainState,
      };

      return chain;
    };

    const table = {
      uuid: (name: string) => makeColumn(name, 'uuid', []),
      string: (name: string, ...args: any[]) => makeColumn(name, 'string', args),
      integer: (name: string) => makeColumn(name, 'integer', []),
      timestamp: (name: string, ...args: any[]) => makeColumn(name, 'timestamp', args),
      jsonb: (name: string) => makeColumn(name, 'jsonb', []),
      text: (name: string) => makeColumn(name, 'text', []),
      index: (columns: string[] | string, indexName?: string) => {
        record.indexes.push({
          columns: Array.isArray(columns) ? columns : [columns],
          indexName,
        });
      },
      unique: (columns: string[] | string) => {
        const key = Array.isArray(columns) ? columns.join('_') : columns;
        makeColumn(`__unique__${key}`, 'unique', [columns]);
      },
    };

    callback(table);
    tables.set(fullTableName, record);
  };

  const knex: any = {
    raw: jest.fn(async () => undefined),
    fn: {
      now: () => 'NOW()',
    },
    schema: {
      withSchema: (schemaName: string) => ({
        createTable: async (tableName: string, callback: (table: any) => void) => {
          createTable(`${schemaName}.${tableName}`, callback);
        },
        dropTableIfExists: async (tableName: string) => {
          dropped.push(`${schemaName}.${tableName}`);
        },
      }),
    },
  };

  return { knex, tables, dropped };
}

describe('20260217113000_create_platform_events_and_outbox migration', () => {
  describe('AC1: create canonical platform events/outbox tables with lineage + delivery fields', () => {
    it('creates platform.events and platform.outbox_events with required fields', async () => {
      const { knex, tables } = buildKnexMock();

      await up(knex);

      expect(knex.raw).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS platform');
      expect(tables.has('platform.events')).toBe(true);
      expect(tables.has('platform.outbox_events')).toBe(true);

      const events = tables.get('platform.events')!;
      const outbox = tables.get('platform.outbox_events')!;

      expect(events.columns.event_name).toBeDefined();
      expect(events.columns.tenant_id).toBeDefined();
      expect(events.columns.actor_id).toBeDefined();
      expect(events.columns.entity_type).toBeDefined();
      expect(events.columns.entity_id).toBeDefined();
      expect(events.columns.occurred_at_utc).toBeDefined();
      expect(events.columns.payload).toBeDefined();

      expect(outbox.columns.delivery_status).toBeDefined();
      expect(outbox.columns.delivery_attempts).toBeDefined();
      expect(outbox.columns.available_at_utc).toBeDefined();
      expect(outbox.columns.delivered_at_utc).toBeDefined();
      expect(outbox.columns.last_delivery_error).toBeDefined();

      expect(outbox.columns.event_id).toBeDefined();
      expect(outbox.columns.tenant_id).toBeDefined();
      expect(outbox.columns.event_name).toBeDefined();
      expect(outbox.columns.entity_type).toBeDefined();
      expect(outbox.columns.entity_id).toBeDefined();
      expect(outbox.columns.occurred_at_utc).toBeDefined();
      expect(outbox.columns.payload).toBeDefined();
    });
  });

  describe('AC2: add operational and replay indexes', () => {
    it('creates indexes for polling, replay, and lineage retrieval', async () => {
      const { knex, tables, dropped } = buildKnexMock();

      await up(knex);

      const events = tables.get('platform.events')!;
      const outbox = tables.get('platform.outbox_events')!;

      expect(events.indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ columns: ['tenant_id', 'occurred_at_utc'] }),
          expect.objectContaining({ columns: ['entity_type', 'entity_id', 'occurred_at_utc'] }),
          expect.objectContaining({ columns: ['event_name', 'occurred_at_utc'] }),
        ])
      );

      expect(outbox.indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ columns: ['delivery_status', 'available_at_utc'] }),
          expect.objectContaining({ columns: ['tenant_id', 'delivery_status', 'available_at_utc'] }),
          expect.objectContaining({ columns: ['event_name', 'occurred_at_utc'] }),
        ])
      );

      await down(knex);
      expect(dropped).toEqual(['platform.outbox_events', 'platform.events']);
    });
  });
});
