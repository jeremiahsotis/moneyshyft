import { down, up } from '../20260224113000_create_connectshyft_neighbors';
import {
  down as downLifecycle,
  up as upLifecycle,
} from '../../../../../shared/database/migrations/20260318130000_add_connectshyft_neighbor_lifecycle_state';

function buildKnexMock() {
  const dropped: string[] = [];

  const knex: any = {
    raw: jest.fn(async () => undefined),
    schema: {
      withSchema: (schema: string) => ({
        dropTableIfExists: async (tableName: string) => {
          dropped.push(`${schema}.${tableName}`);
        },
      }),
    },
  };

  return {
    knex,
    dropped,
  };
}

describe('20260224113000_create_connectshyft_neighbors migration', () => {
  it('creates connectshyft neighbor tables and constraints idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]));

    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_neighbors'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_neighbor_phones'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_neighbors_tenant_neighbor_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_neighbor_phones_sort_order_non_negative_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_neighbor_phones_tenant_neighbor_fk'))).toBe(true);
  });

  it('drops connectshyft neighbor tables in down migration', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'connectshyft.cs_neighbor_phones',
      'connectshyft.cs_neighbors',
    ]);
  });
});

describe('20260318130000_add_connectshyft_neighbor_lifecycle_state migration', () => {
  it('adds deterministic deleted-neighbor lifecycle columns and active-scope index idempotently', async () => {
    const { knex } = buildKnexMock();

    await upLifecycle(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS is_deleted');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS deleted_at_utc');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS deleted_by_user_id');
    expect(rawSql).toContain('connectshyft_cs_neighbors_active_scope_idx');
  });

  it('drops deterministic deleted-neighbor lifecycle columns and index on down migration', async () => {
    const { knex } = buildKnexMock();

    await downLifecycle(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP INDEX IF EXISTS connectshyft_cs_neighbors_active_scope_idx');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS deleted_by_user_id');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS deleted_at_utc');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS is_deleted');
  });
});
