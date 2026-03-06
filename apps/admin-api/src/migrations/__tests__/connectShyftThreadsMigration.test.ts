import { down, up } from '../20260224170000_create_connectshyft_threads';

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

describe('20260224170000_create_connectshyft_threads migration', () => {
  it('creates canonical connectshyft thread schema and lifecycle constraints idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]));

    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_threads'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("state TEXT NOT NULL DEFAULT 'UNCLAIMED'"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('escalation_stage INTEGER NOT NULL DEFAULT 0'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('next_evaluation_at_utc TIMESTAMPTZ DEFAULT NOW()'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('last_inbound_cs_number_id TEXT NOT NULL DEFAULT'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('preferred_outbound_cs_number_id TEXT NOT NULL DEFAULT'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN tenant_id SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN org_unit_id SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN neighbor_id SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN next_evaluation_at_utc DROP NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_threads_state_canonical_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_threads_active_thread_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("WHERE state <> 'CLOSED' AND next_evaluation_at_utc IS NOT NULL"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_threads_due_eval_idx'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('(tenant_id, org_unit_id, next_evaluation_at_utc, id)'))).toBe(true);
  });

  it('drops connectshyft threads table in down migration', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'connectshyft.cs_threads',
    ]);
  });
});
