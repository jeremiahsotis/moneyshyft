import {
  down,
  up,
} from '../20260326190000_add_canonical_thread_provider_number_alignment';

function buildKnexMock() {
  return {
    knex: {
      raw: jest.fn(async () => undefined),
    } as any,
  };
}

describe('20260326190000_add_canonical_thread_provider_number_alignment migration', () => {
  it('adds canonical sender columns, E.164 constraints, and deterministic backfill SQL', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls.some((sql: string) =>
      sql.includes('ADD COLUMN IF NOT EXISTS last_inbound_provider_number_e164 TEXT'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('ADD COLUMN IF NOT EXISTS preferred_outbound_provider_number_e164 TEXT'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('cs_threads_last_inbound_provider_number_e164_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('cs_threads_preferred_outbound_provider_number_e164_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes("last_inbound_provider_number_e164 IS NULL OR last_inbound_provider_number_e164 ~ '^\\+[1-9][0-9]{1,14}$'"))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes("preferred_outbound_provider_number_e164 IS NULL OR preferred_outbound_provider_number_e164 ~ '^\\+[1-9][0-9]{1,14}$'"))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('SET last_inbound_provider_number_e164 = BTRIM(last_inbound_cs_number_id)'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('SET preferred_outbound_provider_number_e164 = BTRIM(preferred_outbound_cs_number_id)'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('HAVING COUNT(*) = 1'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes("BTRIM(threads.last_inbound_cs_number_id) ~* '^cs-number(?:-[a-z0-9]+)*-[0-9]+$'"))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes("BTRIM(threads.preferred_outbound_cs_number_id) ~* '^cs-number(?:-[a-z0-9]+)*-[0-9]+$'"))).toBe(true);
  });

  it('drops canonical sender alignment constraints and columns in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls.some((sql: string) =>
      sql.includes('DROP CONSTRAINT IF EXISTS cs_threads_last_inbound_provider_number_e164_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('DROP CONSTRAINT IF EXISTS cs_threads_preferred_outbound_provider_number_e164_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('DROP COLUMN IF EXISTS last_inbound_provider_number_e164'))).toBe(true);
    expect(rawCalls.some((sql: string) =>
      sql.includes('DROP COLUMN IF EXISTS preferred_outbound_provider_number_e164'))).toBe(true);
  });
});
