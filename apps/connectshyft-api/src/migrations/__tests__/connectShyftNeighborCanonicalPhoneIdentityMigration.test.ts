import {
  down,
  up,
} from '../20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260311100000_shape_connectshyft_neighbor_phones_for_canonical_identity migration', () => {
  it('adds canonical phone identity columns, backfill, and constraints idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS raw_input');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS normalized_e164');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS display_national');
    expect(rawSql).toContain('country_code TEXT NULL');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS national_number');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS validation_status');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS usage_type');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS source');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS is_active');
    expect(rawSql).toContain('normalized_e164 = value_e164');
    expect(rawSql).toContain('cs_neighbor_phones_validation_status_ck');
    expect(rawSql).toContain('cs_neighbor_phones_usage_type_ck');
    expect(rawSql).toContain('cs_neighbor_phones_source_ck');
  });

  it('drops canonical phone identity constraints and columns on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_neighbor_phones_validation_status_ck');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_neighbor_phones_usage_type_ck');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_neighbor_phones_source_ck');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS raw_input');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS normalized_e164');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS display_national');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS country_code');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS national_number');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS validation_status');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS usage_type');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS source');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS is_active');
  });
});
