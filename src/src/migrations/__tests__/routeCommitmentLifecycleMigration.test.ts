import { down, up } from '../20260224153000_create_route_commitments_and_transition_audit';

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

describe('20260224153000_create_route_commitments_and_transition_audit migration', () => {
  it('creates route commitment lifecycle tables and constraints', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS route',
    ]));

    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS route.commitments'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('route_commitments_status_chk'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TABLE IF NOT EXISTS route.commitment_transition_audit'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('route_commitment_transition_audit_previous_status_chk'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('route_commitment_transition_audit_new_status_chk'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('CREATE TRIGGER trg_route_commitments_set_updated_at'))).toBe(true);
  });

  it('drops route commitment lifecycle tables', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(knex.raw).toHaveBeenCalledWith(
      'DROP TRIGGER IF EXISTS trg_route_commitments_set_updated_at ON route.commitments',
    );
    expect(knex.raw).toHaveBeenCalledWith(
      'DROP FUNCTION IF EXISTS route.set_commitments_updated_at()',
    );
    expect(dropped).toEqual([
      'route.commitment_transition_audit',
      'route.commitments',
    ]);
  });
});
