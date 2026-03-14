import { down, up } from '../20260312120000_add_connectshyft_communication_reliability'

function buildKnexMock() {
  const dropped: string[] = []

  const knex: any = {
    raw: jest.fn(async () => undefined),
    schema: {
      withSchema: (schema: string) => ({
        dropTableIfExists: async (tableName: string) => {
          dropped.push(`${schema}.${tableName}`)
        },
      }),
    },
  }

  return {
    knex,
    dropped,
  }
}

describe('20260312120000_add_connectshyft_communication_reliability migration', () => {
  it('creates durable idempotency and append-only audit persistence and extends webhook receipts', async () => {
    const { knex } = buildKnexMock()

    await up(knex)

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0])

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]))
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_communication_idempotency_records'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('CONSTRAINT cs_communication_idempotency_scope_uq UNIQUE'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('response_snapshot_json JSONB NULL'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_communication_audit_log'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes("result_state IN ('succeeded', 'failed', 'ignored_duplicate', 'retrying', 'exhausted')"))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS next_retry_at_utc TIMESTAMPTZ NULL'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS last_failure_classification JSONB NULL'))).toBe(true)
  })

  it('drops audit/idempotency persistence and removes webhook retry metadata in down migration', async () => {
    const { knex, dropped } = buildKnexMock()

    await down(knex)

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0])

    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS last_failure_classification'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS next_retry_at_utc'))).toBe(true)
    expect(dropped).toEqual([
      'connectshyft.cs_communication_audit_log',
      'connectshyft.cs_communication_idempotency_records',
    ])
  })
})
