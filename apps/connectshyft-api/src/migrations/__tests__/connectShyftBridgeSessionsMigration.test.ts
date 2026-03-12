import { down, up } from '../20260311110000_create_connectshyft_bridge_sessions'

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

describe('20260311110000_create_connectshyft_bridge_sessions migration', () => {
  it('creates bridge session and bridge leg persistence with scope and provider-call indexes', async () => {
    const { knex } = buildKnexMock()

    await up(knex)

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0])

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]))
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_bridge_sessions'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('bridge_status TEXT NOT NULL'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('CONSTRAINT cs_bridge_sessions_status_ck CHECK'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('operator_contact_point_id TEXT NOT NULL'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS connectshyft.cs_bridge_legs'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes("CONSTRAINT cs_bridge_legs_role_ck CHECK (leg_role IN ('operator', 'neighbor'))"))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes("leg_status IN ('created', 'dialing', 'ringing', 'answered', 'failed', 'completed', 'canceled')"))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('CONSTRAINT cs_bridge_legs_session_role_uq UNIQUE'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_bridge_sessions_scope_idx'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_bridge_legs_session_idx'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_bridge_legs_provider_call_id_uq'))).toBe(true)
  })

  it('drops bridge leg and bridge session tables in down migration', async () => {
    const { knex, dropped } = buildKnexMock()

    await down(knex)

    expect(dropped).toEqual([
      'connectshyft.cs_bridge_legs',
      'connectshyft.cs_bridge_sessions',
    ])
  })
})
