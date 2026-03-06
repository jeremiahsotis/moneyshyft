import { down, up } from '../20260228103000_create_connectshyft_provider_correlation_mappings';

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

describe('20260228103000_create_connectshyft_provider_correlation_mappings migration', () => {
  it('creates provider identifier mappings and webhook receipt dedupe schema idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]));

    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_provider_identifier_mappings'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('identifier_kind TEXT NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('internal_reference_id TEXT NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_provider_identifier_mappings_kind_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_provider_identifier_mappings_provider_identifier_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('UNIQUE (provider_name, identifier_kind, provider_identifier)'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_provider_identifier_mappings_scope_idx'))).toBe(true);

    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_webhook_receipts'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('provider_event_id TEXT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('dedupe_key TEXT NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_webhook_receipts_identifier_kind_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_webhook_receipts_identifier_presence_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_webhook_receipts_provider_dedupe_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('UNIQUE (provider_name, dedupe_key)'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_webhook_receipts_scope_idx'))).toBe(true);
  });

  it('drops webhook receipt and provider identifier mapping tables in down migration', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'connectshyft.cs_webhook_receipts',
      'connectshyft.cs_provider_identifier_mappings',
    ]);
  });
});
