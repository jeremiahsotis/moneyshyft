import { down, up } from '../20260325143000_add_resolver_outcome_to_connectshyft_identity_ambiguity_events';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260325143000_add_resolver_outcome_to_connectshyft_identity_ambiguity_events migration', () => {
  it('adds resolver-outcome linkage fields, terminal statuses, and supporting indexes', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');

    expect(rawSql).toContain('ALTER TABLE connectshyft.cs_identity_ambiguity_events');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS resolver_review_id TEXT NULL');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS resolver_consumed_by_user_id TEXT NULL');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS resolver_consumed_at_utc TIMESTAMPTZ NULL');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS resolver_outcome JSONB NULL');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_identity_ambiguity_events_status_ck');
    expect(rawSql).toContain(`CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))`);
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_resolver_review_idx');
    expect(rawSql).toContain('(tenant_id, resolver_review_id)');
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_source_context_id_status_idx');
    expect(rawSql).toContain('source_context_id');
  });

  it('drops resolver-outcome linkage fields and restores the prior status check on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');

    expect(rawSql).toContain(
      'DROP INDEX IF EXISTS connectshyft.connectshyft_cs_identity_ambiguity_events_tenant_source_context_id_status_idx',
    );
    expect(rawSql).toContain(
      'DROP INDEX IF EXISTS connectshyft.connectshyft_cs_identity_ambiguity_events_tenant_resolver_review_idx',
    );
    expect(rawSql).toContain(`CHECK (status IN ('pending', 'reviewed'))`);
    expect(rawSql).toContain('DROP COLUMN IF EXISTS resolver_outcome');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS resolver_review_id');
  });
});
