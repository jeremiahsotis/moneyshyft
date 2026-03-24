import { down, up } from '../20260325121000_add_connectshyft_voicemail_acknowledgment_fields';

type TableOperation =
  | { type: 'timestamp'; columnName: string; options?: Record<string, unknown> }
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

describe('20260325121000_add_connectshyft_voicemail_acknowledgment_fields migration', () => {
  it('adds voicemail seen and reviewed timestamps and backfills outbound artifacts', async () => {
    const { alterations, knex } = buildKnexMock();

    await up(knex);

    const voicemailAlteration = findAlteration(alterations, 'connectshyft', 'cs_voicemails');
    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);

    expect(voicemailAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'timestamp', columnName: 'seen_at_utc', options: { useTz: true } },
      { type: 'timestamp', columnName: 'reviewed_at_utc', options: { useTz: true } },
    ]));
    expect(rawCalls.some((sql: string) => sql.includes('seen_at_utc = COALESCE(seen_at_utc, created_at_utc)'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("WHERE COALESCE(direction, 'outbound') = 'outbound'"))).toBe(true);
  });

  it('drops voicemail seen and reviewed timestamps in down migration', async () => {
    const { alterations, knex } = buildKnexMock();

    await down(knex);

    const voicemailAlteration = findAlteration(alterations, 'connectshyft', 'cs_voicemails');

    expect(knex.raw).not.toHaveBeenCalled();
    expect(voicemailAlteration?.operations).toEqual(expect.arrayContaining([
      { type: 'dropColumn', columnName: 'seen_at_utc' },
      { type: 'dropColumn', columnName: 'reviewed_at_utc' },
    ]));
  });
});
