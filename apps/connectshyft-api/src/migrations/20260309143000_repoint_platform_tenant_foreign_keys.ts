import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    INSERT INTO platform.tenants (id, name, status, created_at_utc, updated_at_utc)
    SELECT
      tenant_refs.tenant_id,
      COALESCE(h.name, CONCAT('Recovered Tenant ', SUBSTRING(tenant_refs.tenant_id::text, 1, 8))),
      'active',
      NOW(),
      NOW()
    FROM (
      SELECT tenant_id FROM platform.events
      UNION
      SELECT tenant_id FROM platform.outbox_events
      UNION
      SELECT tenant_id FROM platform.sessions
    ) AS tenant_refs
    LEFT JOIN platform.tenants existing_tenant ON existing_tenant.id = tenant_refs.tenant_id
    LEFT JOIN households h ON h.id = tenant_refs.tenant_id
    WHERE tenant_refs.tenant_id IS NOT NULL
      AND existing_tenant.id IS NULL
  `);

  await knex.raw(`
    ALTER TABLE platform.outbox_events
    DROP CONSTRAINT IF EXISTS outbox_events_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.events
    DROP CONSTRAINT IF EXISTS events_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.sessions
    DROP CONSTRAINT IF EXISTS sessions_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.events
    ADD CONSTRAINT events_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(id)
    ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE platform.outbox_events
    ADD CONSTRAINT outbox_events_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(id)
    ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE platform.sessions
    ADD CONSTRAINT sessions_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES platform.tenants(id)
    ON DELETE CASCADE
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE platform.outbox_events
    DROP CONSTRAINT IF EXISTS outbox_events_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.events
    DROP CONSTRAINT IF EXISTS events_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.sessions
    DROP CONSTRAINT IF EXISTS sessions_tenant_id_foreign
  `);

  await knex.raw(`
    ALTER TABLE platform.events
    ADD CONSTRAINT events_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES households(id)
    ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE platform.outbox_events
    ADD CONSTRAINT outbox_events_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES households(id)
    ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE platform.sessions
    ADD CONSTRAINT sessions_tenant_id_foreign
    FOREIGN KEY (tenant_id)
    REFERENCES households(id)
    ON DELETE CASCADE
  `);
}
