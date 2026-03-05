import { down, up } from '../20260218180000_create_platform_tenant_hierarchy';

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
      timestamp: (name: string) => makeColumn(name, 'timestamp'),
      jsonb: (name: string) => makeColumn(name, 'jsonb'),
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

describe('20260218180000_create_platform_tenant_hierarchy migration', () => {
  it('creates core platform tenancy hierarchy tables', async () => {
    const { knex, tables } = buildKnexMock();

    await up(knex);

    expect(knex.raw).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS platform');
    expect(tables.has('platform.tenants')).toBe(true);
    expect(tables.has('platform.billing_accounts')).toBe(true);
    expect(tables.has('platform.tenant_billing')).toBe(true);
    expect(tables.has('platform.org_units')).toBe(true);
    expect(tables.has('platform.tenant_memberships')).toBe(true);
    expect(tables.has('platform.org_unit_memberships')).toBe(true);

    const orgUnits = tables.get('platform.org_units')!;
    expect(orgUnits.columns.tenant_id.chain.references).toBe('id');
    expect(orgUnits.columns.tenant_id.chain.inTable).toBe('platform.tenants');

    const tenantMemberships = tables.get('platform.tenant_memberships')!;
    expect(tenantMemberships.columns.role_set_json.type).toBe('jsonb');
    expect(tenantMemberships.columns.user_id.chain.references).toBe('id');
    expect(tenantMemberships.columns.user_id.chain.inTable).toBe('users');

    expect(knex.raw).toHaveBeenCalledWith(expect.stringContaining('tenant_billing_one_active_per_tenant_idx'));
  });

  it('drops hierarchy tables in reverse dependency order', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'platform.org_unit_memberships',
      'platform.tenant_memberships',
      'platform.org_units',
      'platform.tenant_billing',
      'platform.billing_accounts',
      'platform.tenants',
    ]);
    expect(knex.raw).toHaveBeenCalledWith('DROP INDEX IF EXISTS platform.tenant_billing_one_active_per_tenant_idx');
  });
});
