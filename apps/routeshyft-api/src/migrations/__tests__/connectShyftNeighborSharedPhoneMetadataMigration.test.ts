import {
  down,
  up,
} from '../20260224143000_add_shared_phone_metadata_to_connectshyft_neighbor_phones';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return {
    knex,
  };
}

describe('20260224143000_add_shared_phone_metadata_to_connectshyft_neighbor_phones migration', () => {
  it('adds shared-phone metadata columns and verification-status constraint idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS is_shared'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS verification_status'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_neighbor_phones_verification_status_ck'))).toBe(true);
  });

  it('drops verification-status constraint and shared-phone metadata columns on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_neighbor_phones_verification_status_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS verification_status'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS is_shared'))).toBe(true);
  });
});
