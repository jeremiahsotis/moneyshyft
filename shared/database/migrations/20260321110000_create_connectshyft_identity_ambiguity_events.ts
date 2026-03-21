import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const AMBIGUITY_EVENTS_TABLE = 'cs_identity_ambiguity_events';
const CONTACT_POINT_TYPE_CHECK = 'cs_identity_ambiguity_events_contact_point_type_ck';
const STATUS_CHECK = 'cs_identity_ambiguity_events_status_ck';
const REASON_CODE_CHECK = 'cs_identity_ambiguity_events_reason_code_ck';
const TENANT_CREATED_INDEX = 'connectshyft_cs_identity_ambiguity_events_tenant_created_idx';
const TENANT_STATUS_CREATED_INDEX = 'connectshyft_cs_identity_ambiguity_events_tenant_status_created_idx';
const TENANT_CONTACT_POINT_INDEX = 'connectshyft_cs_identity_ambiguity_events_tenant_contact_point_idx';
const TENANT_SOURCE_CONTEXT_CREATED_INDEX =
  'connectshyft_cs_identity_ambiguity_events_tenant_source_context_created_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL,
      org_unit_id UUID NULL,
      source_context TEXT NOT NULL,
      source_context_id TEXT NULL,
      normalized_contact_point TEXT NOT NULL,
      contact_point_type TEXT NOT NULL DEFAULT 'phone',
      candidate_neighbor_ids JSONB NOT NULL,
      candidate_count INTEGER NOT NULL,
      ambiguity_reason_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_by_user_id TEXT NULL,
      correlation_id TEXT NULL,
      idempotency_key TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${CONTACT_POINT_TYPE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
          ADD CONSTRAINT ${CONTACT_POINT_TYPE_CHECK}
          CHECK (contact_point_type IN ('phone'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${STATUS_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
          ADD CONSTRAINT ${STATUS_CHECK}
          CHECK (status IN ('pending', 'reviewed'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${REASON_CODE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
          ADD CONSTRAINT ${REASON_CODE_CHECK}
          CHECK (ambiguity_reason_code IN (
            'IDENTITY_MATCH_AMBIGUOUS',
            'PEOPLECORE_LEGACY_DISAGREEMENT',
            'PEOPLECORE_MULTI_CURRENT_LINKS'
          ));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_CREATED_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (tenant_id, created_at_utc DESC)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_STATUS_CREATED_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (tenant_id, status, created_at_utc DESC)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_CONTACT_POINT_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (tenant_id, normalized_contact_point)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${TENANT_SOURCE_CONTEXT_CREATED_INDEX}
    ON ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE} (tenant_id, source_context, created_at_utc DESC)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS ${CONNECTSHYFT_SCHEMA}.${AMBIGUITY_EVENTS_TABLE}
  `);
}
