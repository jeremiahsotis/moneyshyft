import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const THREADS_TABLE = 'cs_threads';
const THREADS_TENANT_THREAD_UNIQUE = 'cs_threads_tenant_thread_uq';
const THREADS_STATE_CANONICAL_CHECK = 'cs_threads_state_canonical_ck';
const THREADS_ESCALATION_STAGE_CHECK = 'cs_threads_escalation_stage_non_negative_ck';
const THREADS_ACTIVE_THREAD_UNIQUE_INDEX = 'cs_threads_active_thread_uq';
const THREADS_DUE_EVAL_INDEX = 'cs_threads_due_eval_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS connectshyft.${THREADS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      neighbor_id TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'VOICE',
      state TEXT NOT NULL DEFAULT 'UNCLAIMED',
      escalation_stage INTEGER NOT NULL DEFAULT 0,
      next_evaluation_at_utc TIMESTAMPTZ DEFAULT NOW(),
      last_inbound_cs_number_id TEXT NOT NULL DEFAULT '',
      preferred_outbound_cs_number_id TEXT NOT NULL DEFAULT '',
      claimed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      claimed_at_utc TIMESTAMPTZ NULL,
      closed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      closed_at_utc TIMESTAMPTZ NULL,
      created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS tenant_id TEXT
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS org_unit_id TEXT
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS neighbor_id TEXT
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'VOICE'
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'UNCLAIMED'
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS escalation_stage INTEGER NOT NULL DEFAULT 0
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS next_evaluation_at_utc TIMESTAMPTZ DEFAULT NOW()
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS last_inbound_cs_number_id TEXT NOT NULL DEFAULT ''
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS preferred_outbound_cs_number_id TEXT NOT NULL DEFAULT ''
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS claimed_at_utc TIMESTAMPTZ NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS closed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS closed_at_utc TIMESTAMPTZ NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS updated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM connectshyft.${THREADS_TABLE}
        WHERE tenant_id IS NULL
          OR org_unit_id IS NULL
          OR neighbor_id IS NULL
      ) THEN
        RAISE EXCEPTION
          'connectshyft.cs_threads has NULL scope columns; backfill tenant_id, org_unit_id, and neighbor_id before continuing';
      END IF;
    END $$;
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ALTER COLUMN tenant_id SET NOT NULL,
      ALTER COLUMN org_unit_id SET NOT NULL,
      ALTER COLUMN neighbor_id SET NOT NULL
  `);

  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ALTER COLUMN next_evaluation_at_utc DROP NOT NULL
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${THREADS_TENANT_THREAD_UNIQUE}'
          AND conrelid = 'connectshyft.${THREADS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${THREADS_TABLE}
          ADD CONSTRAINT ${THREADS_TENANT_THREAD_UNIQUE}
          UNIQUE (tenant_id, id);
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${THREADS_STATE_CANONICAL_CHECK}'
          AND conrelid = 'connectshyft.${THREADS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${THREADS_TABLE}
          ADD CONSTRAINT ${THREADS_STATE_CANONICAL_CHECK}
          CHECK (state IN ('UNCLAIMED', 'CLAIMED', 'CLOSED'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${THREADS_ESCALATION_STAGE_CHECK}'
          AND conrelid = 'connectshyft.${THREADS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${THREADS_TABLE}
          ADD CONSTRAINT ${THREADS_ESCALATION_STAGE_CHECK}
          CHECK (escalation_stage >= 0);
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_threads_scope_idx
    ON connectshyft.${THREADS_TABLE} (tenant_id, org_unit_id, id)
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${THREADS_ACTIVE_THREAD_UNIQUE_INDEX}
    ON connectshyft.${THREADS_TABLE} (tenant_id, org_unit_id, neighbor_id)
    WHERE state <> 'CLOSED'
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS connectshyft.${THREADS_DUE_EVAL_INDEX}
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${THREADS_DUE_EVAL_INDEX}
    ON connectshyft.${THREADS_TABLE} (tenant_id, org_unit_id, next_evaluation_at_utc, id)
    WHERE state <> 'CLOSED' AND next_evaluation_at_utc IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(THREADS_TABLE);
}
