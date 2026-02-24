import { down, up } from '../20260224113000_create_connectshyft_neighbors';

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
