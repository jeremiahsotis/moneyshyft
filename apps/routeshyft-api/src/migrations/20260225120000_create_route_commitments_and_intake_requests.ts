import { Knex } from 'knex';

const ROUTE_SCHEMA = 'route';
const INTAKE_REQUESTS_TABLE = 'intake_requests';

const INTAKE_REQUESTS_STATUS_CHECK = 'route_intake_requests_status_chk';
const INTAKE_REQUESTS_SCHEDULE_MODE_CHECK = 'route_intake_requests_schedule_mode_chk';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${ROUTE_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${ROUTE_SCHEMA}.${INTAKE_REQUESTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
      org_unit_id UUID NOT NULL REFERENCES platform.org_units(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      requested_at_utc TIMESTAMPTZ NOT NULL,
      requested_window_start_utc TIMESTAMPTZ NOT NULL,
      requested_window_end_utc TIMESTAMPTZ NOT NULL,
      schedule_mode TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      commitment_id UUID NULL REFERENCES ${ROUTE_SCHEMA}.commitments(id) ON DELETE SET NULL,
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
}
