import { Knex } from 'knex';

const PEOPLE_SCHEMA = 'people';
const CONTACT_POINT_LINKS_TABLE = 'contact_point_links';
const PERSONS_TABLE = 'persons';
const CONTACT_POINT_LINKS_MERGED_INTO_INDEX = 'people_contact_point_links_merged_into_subject_idx';
const PERSONS_SCOPE_MERGED_INTO_INDEX = 'people_persons_scope_merged_into_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE}
      ADD COLUMN IF NOT EXISTS merged_into_subject_id UUID NULL REFERENCES ${PEOPLE_SCHEMA}.${PERSONS_TABLE}(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS merged_at_utc TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS merged_by_user_id TEXT NULL,
      ADD COLUMN IF NOT EXISTS merge_class TEXT NOT NULL DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS merge_reason TEXT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE}
      DROP CONSTRAINT IF EXISTS people_contact_point_links_merge_class_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE}
      ADD CONSTRAINT people_contact_point_links_merge_class_ck
      CHECK (merge_class IN ('auto', 'review'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${CONTACT_POINT_LINKS_MERGED_INTO_INDEX}
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE} (merged_into_subject_id, id)
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      DROP CONSTRAINT IF EXISTS people_persons_merged_into_required_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      ADD CONSTRAINT people_persons_merged_into_required_ck
      CHECK (
        (status = 'merged' AND merged_into_person_id IS NOT NULL)
        OR status <> 'merged'
      )
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      DROP CONSTRAINT IF EXISTS people_persons_not_merged_into_self_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      ADD CONSTRAINT people_persons_not_merged_into_self_ck
      CHECK (merged_into_person_id IS NULL OR merged_into_person_id <> id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${PERSONS_SCOPE_MERGED_INTO_INDEX}
    ON ${PEOPLE_SCHEMA}.${PERSONS_TABLE} (tenant_id, org_unit_id, merged_into_person_id, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_MERGED_INTO_INDEX}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_SCOPE_MERGED_INTO_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      DROP CONSTRAINT IF EXISTS people_persons_merged_into_required_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE}
      DROP CONSTRAINT IF EXISTS people_persons_not_merged_into_self_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE}
      DROP CONSTRAINT IF EXISTS people_contact_point_links_merge_class_ck
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE}
      DROP COLUMN IF EXISTS merged_into_subject_id,
      DROP COLUMN IF EXISTS merged_at_utc,
      DROP COLUMN IF EXISTS merged_by_user_id,
      DROP COLUMN IF EXISTS merge_class,
      DROP COLUMN IF EXISTS merge_reason
  `);
}
