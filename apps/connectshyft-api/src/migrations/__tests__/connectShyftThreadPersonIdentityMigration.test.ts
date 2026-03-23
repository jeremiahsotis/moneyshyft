import {
  down,
  up,
} from '../20260323180000_add_connectshyft_thread_person_identity';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260323180000_add_connectshyft_thread_person_identity migration', () => {
  it('adds person identity persistence and guarded not-null enforcement idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS person_id UUID NULL');
    expect(rawSql).toContain('REFERENCES people.persons(id) ON DELETE RESTRICT');
    expect(rawSql).toContain('connectshyft_cs_threads_scope_person_idx');
    expect(rawSql).toContain('(tenant_id, org_unit_id, person_id, id)');
    expect(rawSql).toContain('WHERE person_id IS NULL');
    expect(rawSql).toContain(
      'connectshyft.cs_threads has NULL person_id rows; backfill person_id before enabling NOT NULL enforcement',
    );
    expect(rawSql).toContain('ALTER COLUMN person_id SET NOT NULL');
  });

  it('drops the person identity index and column on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_threads_scope_person_idx');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS person_id');
  });
});
