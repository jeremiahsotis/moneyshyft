import { down, up } from '../20260222100000_create_connectshyft_escalation_config';

type ColumnRecord = {
  type: string;
  chain: {
    notNullable: boolean;
    isPrimary: boolean;
  };
};

type TableRecord = {
  columns: Record<string, ColumnRecord>;
  indexes: string[][];
  checks: string[];
  primaryKeys: string[][];
};

function buildKnexMock() {
  const tables = new Map<string, TableRecord>();
  const dropped: string[] = [];

  const createTable = (fullName: string, callback: (table: any) => void) => {
    const record: TableRecord = {
      columns: {},
      indexes: [],
      checks: [],
      primaryKeys: [],
    };

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
        primary: () => {
          state.isPrimary = true;
          return chain;
        },
      };

      record.columns[name] = {
        type,
        chain: state,
      };

      return chain;
    };

    const table = {
      text: (name: string) => makeColumn(name, 'text'),
      integer: (name: string) => makeColumn(name, 'integer'),
      timestamp: (name: string) => makeColumn(name, 'timestamp'),
      primary: (columns: string[]) => {
        record.primaryKeys.push(columns);
      },
      check: (constraint: string) => {
        record.checks.push(constraint);
      },
      index: (columns: string[] | string) => {
        record.indexes.push(Array.isArray(columns) ? columns : [columns]);
      },
    };

    callback(table);
    tables.set(fullName, record);
  };

  const knex: any = {
    raw: jest.fn(async () => undefined),
    fn: {
      now: () => 'NOW()',
    },
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

  return {
    knex,
    tables,
    dropped,
  };
}

describe('20260222100000_create_connectshyft_escalation_config migration', () => {
  it('creates connectshyft escalation config table with baseline checks', async () => {
    const { knex, tables } = buildKnexMock();

    await up(knex);

    expect(knex.raw).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS connectshyft');
    expect(tables.has('connectshyft.cs_org_unit_escalation_config')).toBe(true);

    const escalationConfig = tables.get('connectshyft.cs_org_unit_escalation_config')!;
    expect(escalationConfig.columns.tenant_id.type).toBe('text');
    expect(escalationConfig.columns.org_unit_id.type).toBe('text');
    expect(escalationConfig.columns.escalation_baseline_hours.type).toBe('integer');
    expect(escalationConfig.primaryKeys).toContainEqual(['tenant_id', 'org_unit_id']);
    expect(escalationConfig.checks).toContain('escalation_baseline_hours >= 1 AND escalation_baseline_hours <= 24');
    expect(escalationConfig.indexes).toContainEqual(['tenant_id']);
    expect(escalationConfig.indexes).toContainEqual(['org_unit_id']);
  });

  it('drops connectshyft escalation config table', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual(['connectshyft.cs_org_unit_escalation_config']);
  });
});
