import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const AMBIGUITY_EVENTS_TABLE = 'cs_identity_ambiguity_events';
const STATUS_CHECK = 'cs_identity_ambiguity_events_status_ck';
const TENANT_RESOLVER_REVIEW_INDEX =
  'connectshyft_cs_identity_ambiguity_events_tenant_resolver_review_idx';
const TENANT_SOURCE_CONTEXT_ID_STATUS_INDEX =
  'connectshyft_cs_identity_ambiguity_events_tenant_source_context_id_status_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      ADD COLUMN IF NOT EXISTS resolver_review_id TEXT NULL,
      ADD COLUMN IF NOT EXISTS resolver_consumed_by_user_id TEXT NULL,
      ADD COLUMN IF NOT EXISTS resolver_consumed_at_utc TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS resolver_outcome JSONB NULL
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      DROP CONSTRAINT IF EXISTS ${STATUS_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      ADD CONSTRAINT ${STATUS_CHECK}
      CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_RESOLVER_REVIEW_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (tenant_id, resolver_review_id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_SOURCE_CONTEXT_ID_STATUS_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (
      tenant_id,
      source_context_id,
      status,
      created_at_utc DESC
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${TENANT_SOURCE_CONTEXT_ID_STATUS_INDEX}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${TENANT_RESOLVER_REVIEW_INDEX}
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      DROP CONSTRAINT IF EXISTS ${STATUS_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      ADD CONSTRAINT ${STATUS_CHECK}
      CHECK (status IN ('pending', 'reviewed'))
  `);

  await knex.raw(`
    ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
      DROP COLUMN IF EXISTS resolver_outcome,
      DROP COLUMN IF EXISTS resolver_consumed_at_utc,
      DROP COLUMN IF EXISTS resolver_consumed_by_user_id,
      DROP COLUMN IF EXISTS resolver_review_id
  `);
}
