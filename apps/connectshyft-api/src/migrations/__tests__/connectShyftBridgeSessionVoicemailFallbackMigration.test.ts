import { down, up } from '../20260322193000_add_connectshyft_bridge_session_voicemail_fallback'

type TableOperation =
  | { type: 'timestamp'; columnName: string; options?: Record<string, unknown> }
  | { type: 'text'; columnName: string }
  | { type: 'dropColumn'; columnName: string }

type TableAlteration = {
  schema: string
  tableName: string
  operations: TableOperation[]
}

function buildKnexMock() {
  const alterations: TableAlteration[] = []

  const knex: any = {
    raw: jest.fn(async () => undefined),
    schema: {
      withSchema: (schema: string) => ({
        alterTable: async (tableName: string, callback: (table: {
          timestamp: (columnName: string, options?: Record<string, unknown>) => { nullable: () => void }
          text: (columnName: string) => { nullable: () => void }
          dropColumn: (columnName: string) => void
        }) => void) => {
          const operations: TableOperation[] = []
          const table = {
            timestamp: (columnName: string, options?: Record<string, unknown>) => {
              operations.push({ type: 'timestamp', columnName, options })
              return {
                nullable: () => undefined,
              }
            },
            text: (columnName: string) => {
              operations.push({ type: 'text', columnName })
              return {
                nullable: () => undefined,
              }
            },
            dropColumn: (columnName: string) => {
              operations.push({ type: 'dropColumn', columnName })
            },
          }

          callback(table)
          alterations.push({ schema, tableName, operations })
        },
      }),
    },
  }

  return {
    alterations,
    knex,
  }
}

const findAlteration = (
  alterations: TableAlteration[],
  schema: string,
  tableName: string,
): TableAlteration | undefined => alterations.find((alteration) => (
  alteration.schema === schema && alteration.tableName === tableName
))

describe('20260322193000_add_connectshyft_bridge_session_voicemail_fallback migration', () => {
  it('adds voicemail fallback bridge-session fields, provider control ids, constraint, and index', async () => {
    const { alterations, knex } = buildKnexMock()

    await up(knex)

    const sessionAlteration = findAlteration(alterations, 'connectshyft', 'cs_bridge_sessions')
    const legAlteration = findAlteration(alterations, 'connectshyft', 'cs_bridge_legs')
    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0])

    expect(sessionAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'timestamp', columnName: 'neighbor_ring_started_at_utc', options: { useTz: true } },
      { type: 'timestamp', columnName: 'neighbor_timeout_at_utc', options: { useTz: true } },
      { type: 'timestamp', columnName: 'voicemail_fallback_started_at_utc', options: { useTz: true } },
      { type: 'text', columnName: 'voicemail_artifact_id' },
      { type: 'text', columnName: 'voicemail_recording_url' },
      { type: 'text', columnName: 'voicemail_recording_status' },
      { type: 'text', columnName: 'voicemail_provider_event_id' },
      { type: 'text', columnName: 'voicemail_provider_leg_id' },
    ]))
    expect(legAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'text', columnName: 'provider_call_control_id' },
    ]))
    expect(rawCalls.some((sql: string) => sql.includes('cs_bridge_sessions_voicemail_recording_status_ck'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes("voicemail_recording_status IN ('pending', 'completed', 'failed')"))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_bridge_legs_provider_call_control_idx'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('(bridge_session_id, provider_call_control_id)'))).toBe(true)
  })

  it('drops the voicemail fallback bridge-session fields, provider control id, constraint, and index in down migration', async () => {
    const { alterations, knex } = buildKnexMock()

    await down(knex)

    const sessionAlteration = findAlteration(alterations, 'connectshyft', 'cs_bridge_sessions')
    const legAlteration = findAlteration(alterations, 'connectshyft', 'cs_bridge_legs')
    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0])

    expect(legAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'dropColumn', columnName: 'provider_call_control_id' },
    ]))
    expect(sessionAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'dropColumn', columnName: 'neighbor_ring_started_at_utc' },
      { type: 'dropColumn', columnName: 'neighbor_timeout_at_utc' },
      { type: 'dropColumn', columnName: 'voicemail_fallback_started_at_utc' },
      { type: 'dropColumn', columnName: 'voicemail_artifact_id' },
      { type: 'dropColumn', columnName: 'voicemail_recording_url' },
      { type: 'dropColumn', columnName: 'voicemail_recording_status' },
      { type: 'dropColumn', columnName: 'voicemail_provider_event_id' },
      { type: 'dropColumn', columnName: 'voicemail_provider_leg_id' },
    ]))
    expect(rawCalls.some((sql: string) => sql.includes('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_bridge_legs_provider_call_control_idx'))).toBe(true)
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_bridge_sessions_voicemail_recording_status_ck'))).toBe(true)
  })
})
