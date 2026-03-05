import { down, up } from '../20260220110000_add_tenant_module_entitlements';

type ColumnRecord = {
  type: string;
  chain: {
    notNullable: boolean;
    references?: string;
    inTable?: string;
    onDelete?: string;
    isPrimary: boolean;
  };
};

type TableRecord = {
  columns: Record<string, ColumnRecord>;
  indexes: string[][];
};

function buildKnexMock() {
  const tables = new Map<string, TableRecord>();
  const dropped: string[] = [];

  const createTable = (fullName: string, callback: (table: any) => void) => {
    const record: TableRecord = { columns: {}, indexes: [] };

    const makeColumn = (name: string, type: string) => {
      const state: ColumnRecord['chain'] = {
        notNullable: false,
        isPrimary: false,
      };

      const chain = {
        notNullable: () => {
          state.notNullable = true;
          return chain;
        },
        defaultTo: (_value: any) => chain,
        references: (value: string) => {
          state.references = value;
          return chain;
        },
        inTable: (value: string) => {
          state.inTable = value;
          return chain;
        },
        onDelete: (value: string) => {
          state.onDelete = value;
          return chain;
        },
        primary: () => {
          state.isPrimary = true;
          return chain;
        },
      };

      record.columns[name] = { type, chain: state };
      return chain;
    };

    const table = {
      uuid: (name: string) => makeColumn(name, 'uuid'),
      string: (name: string) => makeColumn(name, 'string'),
      boolean: (name: string) => makeColumn(name, 'boolean'),
      timestamp: (name: string) => makeColumn(name, 'timestamp'),
      index: (columns: string[] | string) => {
        record.indexes.push(Array.isArray(columns) ? columns : [columns]);
      },
      unique: (_columns: string[] | string) => undefined,
      primary: (_columns: string[]) => undefined,
    };

    callback(table);
    tables.set(fullName, record);
  };

  const knex: any = {
    raw: jest.fn(async () => undefined),
    fn: { now: () => 'NOW()' },
    schema: {
      withSchema: (schema: string) => ({
        createTable: async (tableName: string, callback: (table: any) => void) => {
          createTable(`${schema}.${tableName}`, callback);
        },
        dropTableIfExists: async (tableName: string) => {
          dropped.push(`${schema}.${tableName}`);
        },
      }),
    },
  };

  return { knex, tables, dropped };
}

describe('20260220110000_add_tenant_module_entitlements migration', () => {
  it('creates tenant_module_entitlements with tenant/module uniqueness and audit fields', async () => {
    const { knex, tables } = buildKnexMock();

    await up(knex);

    expect(tables.has('platform.tenant_module_entitlements')).toBe(true);

    const entitlements = tables.get('platform.tenant_module_entitlements')!;
    expect(entitlements.columns.id.type).toBe('uuid');
    expect(entitlements.columns.tenant_id.chain.references).toBe('id');
    expect(entitlements.columns.tenant_id.chain.inTable).toBe('platform.tenants');
    expect(entitlements.columns.module_key.type).toBe('string');
    expect(entitlements.columns.enabled.type).toBe('boolean');
    expect(entitlements.columns.reason.type).toBe('string');
    expect(entitlements.columns.created_by_user_id.chain.references).toBe('id');
    expect(entitlements.columns.updated_by_user_id.chain.references).toBe('id');
    expect(entitlements.indexes).toEqual(expect.arrayContaining([
      ['tenant_id'],
      ['module_key'],
    ]));
  });

  it('drops tenant_module_entitlements on rollback', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual(['platform.tenant_module_entitlements']);
  });
});
