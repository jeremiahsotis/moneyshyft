import { down, up } from '../20260322120000_create_connectshyft_operator_callback_numbers';

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

describe('20260322120000_create_connectshyft_operator_callback_numbers migration', () => {
  it('creates operator callback number persistence with tenant-user primary key and E.164 validation', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]));
    expect(rawCalls.some((sql: string) =>
      sql.includes('cs_operator_callback_numbers')
      && sql.includes('CREATE TABLE IF NOT EXISTS'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('CONSTRAINT cs_operator_callback_numbers_pk PRIMARY KEY (tenant_id, user_id)'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('callback_number_e164 TEXT NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('callback_number_raw_input TEXT NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('cs_operator_callback_numbers_e164_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes("callback_number_e164 ~ '^\\+[1-9][0-9]{1,14}$'"))).toBe(true);
  });

  it('drops operator callback number persistence in down migration', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'connectshyft.cs_operator_callback_numbers',
    ]);
  });
});
