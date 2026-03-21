import { down, up } from '../20260321110000_create_connectshyft_identity_ambiguity_events';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260321110000_create_connectshyft_identity_ambiguity_events migration', () => {
  it('creates the connectshyft ambiguity-events table, constraints, and indexes idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');

    expect(rawSql).toContain('CREATE SCHEMA IF NOT EXISTS connectshyft');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS connectshyft.cs_identity_ambiguity_events');
    expect(rawSql).toContain('tenant_id UUID NOT NULL');
    expect(rawSql).toContain('org_unit_id UUID NULL');
    expect(rawSql).toContain(`candidate_neighbor_ids JSONB NOT NULL`);
    expect(rawSql).toContain(`candidate_count INTEGER NOT NULL`);
    expect(rawSql).toContain('cs_identity_ambiguity_events_contact_point_type_ck');
    expect(rawSql).toContain(`CHECK (contact_point_type IN ('phone'))`);
    expect(rawSql).toContain('cs_identity_ambiguity_events_status_ck');
    expect(rawSql).toContain(`CHECK (status IN ('pending', 'reviewed'))`);
    expect(rawSql).toContain('cs_identity_ambiguity_events_reason_code_ck');
    expect(rawSql).toContain(`'IDENTITY_MATCH_AMBIGUOUS'`);
    expect(rawSql).toContain(`'PEOPLECORE_LEGACY_DISAGREEMENT'`);
    expect(rawSql).toContain(`'PEOPLECORE_MULTI_CURRENT_LINKS'`);
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_created_idx');
    expect(rawSql).toContain('(tenant_id, created_at_utc DESC)');
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_status_created_idx');
    expect(rawSql).toContain('(tenant_id, status, created_at_utc DESC)');
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_contact_point_idx');
    expect(rawSql).toContain('(tenant_id, normalized_contact_point)');
    expect(rawSql).toContain('connectshyft_cs_identity_ambiguity_events_tenant_source_context_created_idx');
    expect(rawSql).toContain('(tenant_id, source_context, created_at_utc DESC)');
  });

  it('drops the ambiguity-events table on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP TABLE IF EXISTS connectshyft.cs_identity_ambiguity_events');
  });
});
