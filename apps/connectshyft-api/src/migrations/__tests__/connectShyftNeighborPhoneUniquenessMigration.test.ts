import {
  down,
  up,
} from '../20260318143000_add_connectshyft_neighbor_phone_uniqueness';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260318143000_add_connectshyft_neighbor_phone_uniqueness migration', () => {
  it('adds uniqueness-enforcement columns, grandfathering backfill, and partial unique index idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS uniqueness_enforcement_state');
    expect(rawSql).toContain("DEFAULT 'ENFORCED'");
    expect(rawSql).toContain('cs_neighbor_phones_uniqueness_enforcement_state_ck');
    expect(rawSql).toContain("SET uniqueness_enforcement_state = 'LEGACY_EXEMPT'");
    expect(rawSql).toContain("SET uniqueness_enforcement_state = 'ENFORCED'");
    expect(rawSql).toContain('connectshyft_cs_neighbor_phones_current_unique_e164_uq');
    expect(rawSql).toContain('(tenant_id, normalized_e164)');
    expect(rawSql).toContain("WHERE is_active = TRUE AND uniqueness_enforcement_state = 'ENFORCED'");
  });

  it('drops the partial unique index and grandfathering column on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_neighbor_phones_current_unique_e164_uq');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_neighbor_phones_uniqueness_enforcement_state_ck');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS uniqueness_enforcement_state');
  });
});
