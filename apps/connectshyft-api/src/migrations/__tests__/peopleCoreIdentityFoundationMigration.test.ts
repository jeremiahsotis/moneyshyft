import { down, up } from '../20260321100000_create_peoplecore_identity_foundation';

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

describe('20260321100000_create_peoplecore_identity_foundation migration', () => {
  it('creates PeopleCore identity foundation tables, indexes, and constraints idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');

    expect(rawSql).toContain('CREATE SCHEMA IF NOT EXISTS people');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.persons');
    expect(rawSql).toContain('people_persons_status_ck');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.households');
    expect(rawSql).toContain('people_households_status_ck');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.household_memberships');
    expect(rawSql).toContain('people_household_memberships_role_ck');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.contact_points');
    expect(rawSql).toContain('people_contact_points_type_ck');
    expect(rawSql).toContain('people_contact_points_status_ck');
    expect(rawSql).toContain('people_contact_points_tenant_type_normalized_value_uq');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.contact_point_links');
    expect(rawSql).toContain('people_contact_point_links_confidence_band_ck');
    expect(rawSql).toContain('people_contact_point_links_confirmation_source_ck');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.contact_point_events');
    expect(rawSql).toContain('people_contact_point_events_event_type_ck');
    expect(rawSql).toContain('CREATE TABLE IF NOT EXISTS people.resolver_reviews');
    expect(rawSql).toContain(`candidate_person_ids JSONB NOT NULL DEFAULT '[]'::jsonb`);
    expect(rawSql).toContain(`confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb`);
    expect(rawSql).toContain(`risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb`);
    expect(rawSql).toContain('people_resolver_reviews_review_status_ck');
    expect(rawSql).toContain('people_resolver_reviews_resolution_type_ck');
  });

  it('drops PeopleCore identity foundation tables in reverse dependency order', async () => {
    const { knex, dropped } = buildKnexMock();

    await down(knex);

    expect(dropped).toEqual([
      'people.resolver_reviews',
      'people.contact_point_events',
      'people.contact_point_links',
      'people.household_memberships',
      'people.contact_points',
      'people.households',
      'people.persons',
    ]);
  });
});
