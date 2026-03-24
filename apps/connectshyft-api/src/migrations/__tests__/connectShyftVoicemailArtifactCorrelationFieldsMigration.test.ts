import { down, up } from '../20260325102000_add_connectshyft_voicemail_artifact_correlation_fields';

type TableOperation =
  | { type: 'timestamp'; columnName: string; options?: Record<string, unknown> }
  | { type: 'text'; columnName: string }
  | { type: 'dropColumn'; columnName: string };

type TableAlteration = {
  schema: string;
  tableName: string;
  operations: TableOperation[];
};

function buildKnexMock() {
  const alterations: TableAlteration[] = [];

  const knex: any = {
    raw: jest.fn(async () => undefined),
    schema: {
      withSchema: (schema: string) => ({
        alterTable: async (tableName: string, callback: (table: {
          timestamp: (columnName: string, options?: Record<string, unknown>) => { nullable: () => void }
          text: (columnName: string) => { nullable: () => void }
          dropColumn: (columnName: string) => void
        }) => void) => {
          const operations: TableOperation[] = [];
          const table = {
            timestamp: (columnName: string, options?: Record<string, unknown>) => {
              operations.push({ type: 'timestamp', columnName, options });
              return {
                nullable: () => undefined,
              };
            },
            text: (columnName: string) => {
              operations.push({ type: 'text', columnName });
              return {
                nullable: () => undefined,
              };
            },
            dropColumn: (columnName: string) => {
              operations.push({ type: 'dropColumn', columnName });
            },
          };

          callback(table);
          alterations.push({ schema, tableName, operations });
        },
      }),
    },
  };

  return {
    alterations,
    knex,
  };
}

const findAlteration = (
  alterations: TableAlteration[],
  schema: string,
  tableName: string,
): TableAlteration | undefined => alterations.find((alteration) => (
  alteration.schema === schema && alteration.tableName === tableName
));

describe('20260325102000_add_connectshyft_voicemail_artifact_correlation_fields migration', () => {
  it('adds voicemail artifact correlation, direction, and transcription persistence fields', async () => {
    const { alterations, knex } = buildKnexMock();

    await up(knex);

    const voicemailAlteration = findAlteration(alterations, 'connectshyft', 'cs_voicemails');
    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(voicemailAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'text', columnName: 'bridge_session_id' },
      { type: 'text', columnName: 'contact_point_id' },
      { type: 'text', columnName: 'direction' },
      { type: 'text', columnName: 'provider_event_id' },
      { type: 'text', columnName: 'provider_leg_id' },
      { type: 'text', columnName: 'provider_recording_id' },
      { type: 'text', columnName: 'transcription_status' },
      { type: 'text', columnName: 'transcription_text' },
      { type: 'text', columnName: 'transcription_provider' },
      { type: 'timestamp', columnName: 'transcription_requested_at_utc', options: { useTz: true } },
      { type: 'timestamp', columnName: 'transcription_completed_at_utc', options: { useTz: true } },
      { type: 'timestamp', columnName: 'transcription_failed_at_utc', options: { useTz: true } },
    ]));
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN call_id DROP NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_voicemails_direction_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("direction IN ('inbound', 'outbound')"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_voicemails_transcription_status_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("transcription_status IN ('pending', 'completed', 'failed')"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_voicemails_provider_recording_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_voicemails_provider_event_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_voicemails_bridge_leg_direction_uq'))).toBe(true);
  });

  it('drops voicemail artifact correlation and transcription persistence fields in down migration', async () => {
    const { alterations, knex } = buildKnexMock();

    await down(knex);

    const voicemailAlteration = findAlteration(alterations, 'connectshyft', 'cs_voicemails');
    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(voicemailAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'dropColumn', columnName: 'bridge_session_id' },
      { type: 'dropColumn', columnName: 'contact_point_id' },
      { type: 'dropColumn', columnName: 'direction' },
      { type: 'dropColumn', columnName: 'provider_event_id' },
      { type: 'dropColumn', columnName: 'provider_leg_id' },
      { type: 'dropColumn', columnName: 'provider_recording_id' },
      { type: 'dropColumn', columnName: 'transcription_status' },
      { type: 'dropColumn', columnName: 'transcription_text' },
      { type: 'dropColumn', columnName: 'transcription_provider' },
      { type: 'dropColumn', columnName: 'transcription_requested_at_utc' },
      { type: 'dropColumn', columnName: 'transcription_completed_at_utc' },
      { type: 'dropColumn', columnName: 'transcription_failed_at_utc' },
    ]));
    expect(rawCalls.some((sql: string) => sql.includes('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_voicemails_provider_recording_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_voicemails_provider_event_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_voicemails_bridge_leg_direction_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_voicemails_direction_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_voicemails_transcription_status_ck'))).toBe(true);
  });
});
