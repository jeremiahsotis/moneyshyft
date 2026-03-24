import { KnexPeopleCoreStore } from '../store';

const FIXED_NOW = '2026-03-24T16:00:00.000Z';

type QueryRow = Record<string, any>;
type QueryTables = Record<string, QueryRow[]>;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const normalizeColumn = (column: string): string => column.split('.').pop() || column;

const projectRow = <T extends QueryRow>(row: T, columns?: readonly string[]): T => {
  if (!columns || columns.length === 0) {
    return deepClone(row);
  }

  return columns.reduce((projected, column) => {
    projected[normalizeColumn(column)] = row[normalizeColumn(column)];
    return projected;
  }, {} as QueryRow) as T;
};

const buildInsertedRow = (tableKey: string, input: QueryRow, nextId: () => string): QueryRow => {
  if (tableKey === 'people.contact_point_events') {
    return {
      id: input.id ?? nextId(),
      tenant_id: input.tenant_id,
      contact_point_id: input.contact_point_id,
      event_type: input.event_type,
      event_source: input.event_source,
      related_object_type: input.related_object_type ?? null,
      related_object_id: input.related_object_id ?? null,
      created_at_utc: input.created_at_utc ?? FIXED_NOW,
    };
  }

  return {
    id: input.id ?? nextId(),
    ...input,
  };
};

const createStatefulKnexMock = (initialTables: QueryTables) => {
  const tables: QueryTables = Object.fromEntries(
    Object.entries(initialTables).map(([key, rows]) => [key, deepClone(rows)]),
  );
  const idCounters = new Map<string, number>();

  const nextIdForTable = (tableKey: string): string => {
    const next = (idCounters.get(tableKey) ?? 0) + 1;
    idCounters.set(tableKey, next);
    return `${tableKey.replace(/[.]/g, '_')}_${next}`;
  };

  const getRows = (tableKey: string): QueryRow[] => {
    if (!tables[tableKey]) {
      tables[tableKey] = [];
    }

    return tables[tableKey];
  };

  const knex: any = {
    fn: {
      now: () => FIXED_NOW,
    },
    transaction: async (callback: (trx: any) => Promise<unknown>) => callback(knex),
    withSchema: (schema: string) => ({
      table: (tableName: string) => {
        const tableKey = `${schema}.${tableName}`;
        const filters: Array<(row: QueryRow) => boolean> = [];

        const applyFilters = (): QueryRow[] =>
          getRows(tableKey).filter((row) => filters.every((filter) => filter(row)));

        const builder: any = {
          where: (clause: QueryRow) => {
            filters.push((row) =>
              Object.entries(clause).every(([column, value]) => row[normalizeColumn(column)] === value));
            return builder;
          },
          first: async (columns?: readonly string[]) => {
            const row = applyFilters()[0];
            return row ? projectRow(row, columns) : null;
          },
          insert: (value: QueryRow | QueryRow[]) => {
            const inputs = Array.isArray(value) ? value : [value];
            const insertedRows = inputs.map((row) =>
              buildInsertedRow(tableKey, row, () => nextIdForTable(tableKey)));
            getRows(tableKey).push(...insertedRows);

            return {
              returning: async (columns?: readonly string[]) =>
                insertedRows.map((row) => projectRow(row, columns)),
            };
          },
          update: async (patch: QueryRow) => {
            const rows = applyFilters();
            rows.forEach((row) => {
              Object.assign(row, patch);
            });
            return rows.length;
          },
        };

        return builder;
      },
    }),
  };

  return {
    knex,
    tables,
  };
};

describe('KnexPeopleCoreStore updateContactPointStatus', () => {
  it('updates the status column and inserts a lifecycle_changed event when the status changes', async () => {
    const contactPointId = 'contact-point-1';
    const { knex, tables } = createStatefulKnexMock({
      'people.contact_points': [
        {
          id: contactPointId,
          tenant_id: 'tenant-1',
          type: 'phone',
          normalized_value: '+12605551212',
          raw_value: '(260) 555-1212',
          status: 'active_personal',
          first_seen_at_utc: FIXED_NOW,
          last_seen_at_utc: FIXED_NOW,
          last_inbound_at_utc: null,
          last_outbound_at_utc: null,
          suspected_shared: false,
          confirmed_shared: false,
          reassignment_suspected: false,
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
      ],
      'people.contact_point_events': [],
    });
    const store = new KnexPeopleCoreStore(knex);

    await store.updateContactPointStatus({
      tenantId: 'tenant-1',
      contactPointId,
      newStatus: 'active_shared_possible',
    });

    expect(tables['people.contact_points'][0]).toMatchObject({
      id: contactPointId,
      status: 'active_shared_possible',
      updated_at_utc: FIXED_NOW,
    });
    expect(tables['people.contact_point_events']).toEqual([
      expect.objectContaining({
        tenant_id: 'tenant-1',
        contact_point_id: contactPointId,
        event_type: 'lifecycle_changed',
        event_source: 'peoplecore.lifecycle',
        related_object_type: 'effective_status',
        related_object_id: 'active_shared_possible',
      }),
    ]);
  });

  it('does nothing when the status is unchanged', async () => {
    const contactPointId = 'contact-point-1';
    const { knex, tables } = createStatefulKnexMock({
      'people.contact_points': [
        {
          id: contactPointId,
          tenant_id: 'tenant-1',
          type: 'phone',
          normalized_value: '+12605551212',
          raw_value: '(260) 555-1212',
          status: 'active_personal',
          first_seen_at_utc: FIXED_NOW,
          last_seen_at_utc: FIXED_NOW,
          last_inbound_at_utc: null,
          last_outbound_at_utc: null,
          suspected_shared: false,
          confirmed_shared: false,
          reassignment_suspected: false,
          created_at_utc: FIXED_NOW,
          updated_at_utc: FIXED_NOW,
        },
      ],
      'people.contact_point_events': [],
    });
    const store = new KnexPeopleCoreStore(knex);

    await store.updateContactPointStatus({
      tenantId: 'tenant-1',
      contactPointId,
      newStatus: 'active_personal',
    });

    expect(tables['people.contact_points'][0]).toMatchObject({
      id: contactPointId,
      status: 'active_personal',
      updated_at_utc: FIXED_NOW,
    });
    expect(tables['people.contact_point_events']).toHaveLength(0);
  });
});
