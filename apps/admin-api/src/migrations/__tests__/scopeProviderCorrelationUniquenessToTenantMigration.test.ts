import {
  down,
  up,
} from '../20260301113000_scope_provider_correlation_uniqueness_to_tenant';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return {
    knex,
  };
}

describe('20260301113000_scope_provider_correlation_uniqueness_to_tenant migration', () => {
  it('updates provider correlation uniqueness constraints to include tenant scope', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls.some((sql: string) => sql.includes(
      'DROP CONSTRAINT IF EXISTS cs_provider_identifier_mappings_provider_identifier_uq',
    ))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes(
      'UNIQUE (tenant_id, provider_name, identifier_kind, provider_identifier)',
    ))).toBe(true);

    expect(rawCalls.some((sql: string) => sql.includes(
      'DROP CONSTRAINT IF EXISTS cs_webhook_receipts_provider_dedupe_uq',
    ))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes(
      'UNIQUE (tenant_id, provider_name, dedupe_key)',
    ))).toBe(true);
  });

  it('restores pre-tenant uniqueness constraints in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls.some((sql: string) => sql.includes(
      'UNIQUE (provider_name, identifier_kind, provider_identifier)',
    ))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes(
      'UNIQUE (provider_name, dedupe_key)',
    ))).toBe(true);
  });
});
