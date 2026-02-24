import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS route');

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS route.commitments (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
      org_unit_id uuid REFERENCES platform.org_units(id) ON DELETE SET NULL,
      source_type text NOT NULL,
      source_id text NOT NULL,
      external_ref text,
      status text NOT NULL,
      created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      terminal_at_utc timestamptz,
      terminal_reason text,
      created_at_utc timestamptz NOT NULL DEFAULT now(),
      updated_at_utc timestamptz NOT NULL DEFAULT now()
    )
  `);

  await knex.raw(`
    ALTER TABLE route.commitments
    DROP CONSTRAINT IF EXISTS route_commitments_status_chk
  `);
  await knex.raw(`
    ALTER TABLE route.commitments
    ADD CONSTRAINT route_commitments_status_chk
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'refused'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitments_tenant_status_idx
    ON route.commitments (tenant_id, status)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitments_tenant_org_unit_idx
    ON route.commitments (tenant_id, org_unit_id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS route.commitment_transition_audit (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
      commitment_id uuid NOT NULL REFERENCES route.commitments(id) ON DELETE CASCADE,
      actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
      reason text NOT NULL,
      previous_status text NOT NULL,
      new_status text NOT NULL,
      policy_exception_code text,
      occurred_at_utc timestamptz NOT NULL DEFAULT now()
    )
  `);

  await knex.raw(`
    ALTER TABLE route.commitment_transition_audit
    DROP CONSTRAINT IF EXISTS route_commitment_transition_audit_previous_status_chk
  `);
  await knex.raw(`
    ALTER TABLE route.commitment_transition_audit
    ADD CONSTRAINT route_commitment_transition_audit_previous_status_chk
    CHECK (previous_status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'refused'))
  `);
  await knex.raw(`
    ALTER TABLE route.commitment_transition_audit
    DROP CONSTRAINT IF EXISTS route_commitment_transition_audit_new_status_chk
  `);
  await knex.raw(`
    ALTER TABLE route.commitment_transition_audit
    ADD CONSTRAINT route_commitment_transition_audit_new_status_chk
    CHECK (new_status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'refused'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitment_transition_audit_commitment_time_idx
    ON route.commitment_transition_audit (commitment_id, occurred_at_utc)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS route_commitment_transition_audit_tenant_time_idx
    ON route.commitment_transition_audit (tenant_id, occurred_at_utc)
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION route.set_commitments_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at_utc = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_route_commitments_set_updated_at
    ON route.commitments
  `);
  await knex.raw(`
    CREATE TRIGGER trg_route_commitments_set_updated_at
    BEFORE UPDATE ON route.commitments
    FOR EACH ROW
    EXECUTE FUNCTION route.set_commitments_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_route_commitments_set_updated_at ON route.commitments');
  await knex.raw('DROP FUNCTION IF EXISTS route.set_commitments_updated_at()');
  await knex.schema.withSchema('route').dropTableIfExists('commitment_transition_audit');
  await knex.schema.withSchema('route').dropTableIfExists('commitments');
}
