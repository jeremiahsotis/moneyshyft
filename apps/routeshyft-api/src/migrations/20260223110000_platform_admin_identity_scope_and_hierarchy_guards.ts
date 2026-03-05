import { Knex } from 'knex';

const USERS_EMAIL_LOOKUP_IDX = 'users_email_lookup_idx';
const USERS_NAME_LOOKUP_IDX = 'users_name_lookup_idx';
const ORG_UNITS_TENANT_PARENT_IDX = 'platform_org_units_tenant_parent_idx';
const TENANTS_TENANCY_MODEL_CHECK = 'tenants_tenancy_model_ck';
const ORG_UNITS_NO_SELF_PARENT_CHECK = 'org_units_no_self_parent_ck';
const BACKFILL_REASON = 'governed-module-backfill-20260223';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').alterTable('tenants', (table) => {
    table.string('tenancy_model', 32).notNullable().defaultTo('single-tenant');
  });

  await knex.raw(`
    ALTER TABLE platform.tenants
    DROP CONSTRAINT IF EXISTS ${TENANTS_TENANCY_MODEL_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE platform.tenants
    ADD CONSTRAINT ${TENANTS_TENANCY_MODEL_CHECK}
    CHECK (tenancy_model IN ('single-tenant', 'multi-tenant'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${USERS_EMAIL_LOOKUP_IDX}
    ON users (LOWER(email), id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${USERS_NAME_LOOKUP_IDX}
    ON users (LOWER(first_name), LOWER(last_name), id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${ORG_UNITS_TENANT_PARENT_IDX}
    ON platform.org_units (tenant_id, parent_org_unit_id)
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    DROP CONSTRAINT IF EXISTS ${ORG_UNITS_NO_SELF_PARENT_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    ADD CONSTRAINT ${ORG_UNITS_NO_SELF_PARENT_CHECK}
    CHECK (parent_org_unit_id IS NULL OR parent_org_unit_id <> id)
  `);

  await knex.raw(
    `
    INSERT INTO platform.tenant_module_entitlements (
      tenant_id,
      module_key,
      enabled,
      reason,
      created_by_user_id,
      updated_by_user_id,
      created_at_utc,
      updated_at_utc
    )
    SELECT
      tenants.id,
      modules.module_key,
      TRUE,
      ?,
      NULL,
      NULL,
      NOW(),
      NOW()
    FROM platform.tenants AS tenants
    CROSS JOIN (VALUES ('connectshyft'), ('moneyshyft')) AS modules(module_key)
    LEFT JOIN platform.tenant_module_entitlements AS existing
      ON existing.tenant_id = tenants.id
      AND existing.module_key = modules.module_key
    WHERE existing.id IS NULL
    `,
    [BACKFILL_REASON]
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `
    DELETE FROM platform.tenant_module_entitlements
    WHERE module_key IN ('connectshyft', 'moneyshyft')
      AND reason = ?
    `,
    [BACKFILL_REASON]
  );

  await knex.raw(`
    ALTER TABLE platform.org_units
    DROP CONSTRAINT IF EXISTS ${ORG_UNITS_NO_SELF_PARENT_CHECK}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS platform.${ORG_UNITS_TENANT_PARENT_IDX}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${USERS_NAME_LOOKUP_IDX}
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${USERS_EMAIL_LOOKUP_IDX}
  `);

  await knex.raw(`
    ALTER TABLE platform.tenants
    DROP CONSTRAINT IF EXISTS ${TENANTS_TENANCY_MODEL_CHECK}
  `);

  await knex.schema.withSchema('platform').alterTable('tenants', (table) => {
    table.dropColumn('tenancy_model');
  });
}
