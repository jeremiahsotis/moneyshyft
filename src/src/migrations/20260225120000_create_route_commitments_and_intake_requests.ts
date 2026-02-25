import { Knex } from 'knex';

const ROUTE_SCHEMA = 'route';
const COMMITMENTS_TABLE = 'commitments';
const COMMITMENT_AUDIT_TABLE = 'commitment_transition_audit';
const INTAKE_REQUESTS_TABLE = 'intake_requests';

const COMMITMENTS_STATUS_CHECK = 'route_commitments_status_chk';
const COMMITMENT_AUDIT_PREVIOUS_STATUS_CHECK = 'route_commitment_audit_previous_status_chk';
const COMMITMENT_AUDIT_NEW_STATUS_CHECK = 'route_commitment_audit_new_status_chk';
const INTAKE_REQUESTS_STATUS_CHECK = 'route_intake_requests_status_chk';
const INTAKE_REQUESTS_SCHEDULE_MODE_CHECK = 'route_intake_requests_schedule_mode_chk';

const COMMITMENT_STATUSES = "'scheduled','in_progress','completed','canceled','refused'";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${ROUTE_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_ref TEXT NULL,
      status TEXT NOT NULL,
      created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      terminal_at_utc TIMESTAMPTZ NULL,
      terminal_reason TEXT NULL,
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
        WHERE conname = '${COMMITMENTS_STATUS_CHECK}'
          AND conrelid = '${ROUTE_SCHEMA}.${COMMITMENTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE}
          ADD CONSTRAINT ${COMMITMENTS_STATUS_CHECK}
          CHECK (status IN (${COMMITMENT_STATUSES}));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitments_scope_idx
      ON ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE} (tenant_id, org_unit_id, id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitments_status_idx
      ON ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE} (tenant_id, status, updated_at_utc DESC)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      commitment_id UUID NOT NULL REFERENCES ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE}(id) ON DELETE CASCADE,
      actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      policy_exception_code TEXT NULL,
      occurred_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${COMMITMENT_AUDIT_PREVIOUS_STATUS_CHECK}'
          AND conrelid = '${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE}
          ADD CONSTRAINT ${COMMITMENT_AUDIT_PREVIOUS_STATUS_CHECK}
          CHECK (previous_status IN (${COMMITMENT_STATUSES}));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${COMMITMENT_AUDIT_NEW_STATUS_CHECK}'
          AND conrelid = '${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE}
          ADD CONSTRAINT ${COMMITMENT_AUDIT_NEW_STATUS_CHECK}
          CHECK (new_status IN (${COMMITMENT_STATUSES}));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitment_audit_lookup_idx
      ON ${ROUTE_SCHEMA}.${COMMITMENT_AUDIT_TABLE} (tenant_id, commitment_id, occurred_at_utc DESC)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      requested_at_utc TIMESTAMPTZ NOT NULL,
      requested_window_start_utc TIMESTAMPTZ NOT NULL,
      requested_window_end_utc TIMESTAMPTZ NOT NULL,
      schedule_mode TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      commitment_id UUID NULL REFERENCES ${ROUTE_SCHEMA}.${COMMITMENTS_TABLE}(id) ON DELETE SET NULL,
      refusal_reason_code TEXT NULL,
      refusal_message TEXT NULL,
      refusal_alternatives JSONB NULL,
      refusal_next_steps TEXT NULL,
      created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
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
        WHERE conname = '${INTAKE_REQUESTS_STATUS_CHECK}'
          AND conrelid = '${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE}
          ADD CONSTRAINT ${INTAKE_REQUESTS_STATUS_CHECK}
          CHECK (status IN ('Accepted', 'Refused'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${INTAKE_REQUESTS_SCHEDULE_MODE_CHECK}'
          AND conrelid = '${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE}
          ADD CONSTRAINT ${INTAKE_REQUESTS_SCHEDULE_MODE_CHECK}
          CHECK (schedule_mode IN ('pickup', 'delivery'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_intake_requests_scope_idx
      ON ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE} (tenant_id, org_unit_id, id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_intake_requests_channel_idx
      ON ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE} (tenant_id, org_unit_id, channel, requested_at_utc DESC)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(INTAKE_REQUESTS_TABLE);
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(COMMITMENT_AUDIT_TABLE);
  await knex.schema.withSchema(ROUTE_SCHEMA).dropTableIfExists(COMMITMENTS_TABLE);
}
