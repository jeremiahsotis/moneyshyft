import { Knex } from 'knex';

const ORG_UNITS_STATUS_CHECK = 'platform_org_units_status_ck';
const TENANT_STRUCTURE_RULES_TYPES_CHECK = 'tenant_structure_rules_allowed_node_types_ck';
const NUMBER_MAPPINGS_UNIQUE_NUMBER = 'cs_number_mappings_tenant_number_uq';
const NUMBER_MAPPINGS_UNIQUE_ID = 'cs_number_mappings_tenant_mapping_uq';
const IDEMPOTENCY_UNIQUE = 'platform_idempotency_requests_unique';

const defaultAllowedNodeTypes = JSON.stringify(['SUBTENANT', 'ORGUNIT', 'GROUP']);

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.schema.withSchema('platform').createTable('tenant_structure_rules', (table) => {
    table.uuid('tenant_id').primary().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.integer('max_depth').notNullable().defaultTo(2);
    table.jsonb('allowed_node_types').notNullable().defaultTo(defaultAllowedNodeTypes);
    table.boolean('allow_viewer_role').notNullable().defaultTo(false);
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE platform.tenant_structure_rules
    DROP CONSTRAINT IF EXISTS ${TENANT_STRUCTURE_RULES_TYPES_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE platform.tenant_structure_rules
    ADD CONSTRAINT ${TENANT_STRUCTURE_RULES_TYPES_CHECK}
    CHECK (
      jsonb_typeof(allowed_node_types) = 'array'
      AND allowed_node_types <@ '["SUBTENANT","ORGUNIT","GROUP"]'::jsonb
    )
  `);

  await knex.raw(`
    INSERT INTO platform.tenant_structure_rules (
      tenant_id,
      max_depth,
      allowed_node_types,
      allow_viewer_role,
      created_at_utc,
      updated_at_utc
    )
    SELECT
      tenants.id,
      2,
      ?::jsonb,
      FALSE,
      NOW(),
      NOW()
    FROM platform.tenants AS tenants
    LEFT JOIN platform.tenant_structure_rules AS rules
      ON rules.tenant_id = tenants.id
    WHERE rules.tenant_id IS NULL
  `, [defaultAllowedNodeTypes]);

  await knex.raw(`
    ALTER TABLE platform.org_units
    ADD COLUMN IF NOT EXISTS node_type VARCHAR(32) NOT NULL DEFAULT 'ORGUNIT'
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    ADD COLUMN IF NOT EXISTS archived_at_utc TIMESTAMPTZ NULL
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    ADD COLUMN IF NOT EXISTS archived_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL
  `);

  await knex.raw(`
    UPDATE platform.org_units
    SET node_type = CASE
      WHEN UPPER(type) IN ('SUBTENANT', 'SUB_TENANT', 'SUB-TENANT') THEN 'SUBTENANT'
      WHEN UPPER(type) = 'GROUP' THEN 'GROUP'
      ELSE 'ORGUNIT'
    END
    WHERE node_type IS NULL OR node_type = 'ORGUNIT'
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    DROP CONSTRAINT IF EXISTS ${ORG_UNITS_STATUS_CHECK}
  `);

  await knex.raw(`
    ALTER TABLE platform.org_units
    ADD CONSTRAINT ${ORG_UNITS_STATUS_CHECK}
    CHECK (status IN ('active', 'archived'))
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS platform_org_units_tenant_status_node_type_idx
    ON platform.org_units (tenant_id, status, node_type)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS platform_org_units_tenant_parent_name_idx
    ON platform.org_units (tenant_id, parent_org_unit_id, name, id)
  `);

  await knex.schema.withSchema('platform').createTable('org_unit_module_overrides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('org_unit_id').notNullable().references('id').inTable('platform.org_units').onDelete('CASCADE');
    table.string('module_key', 128).notNullable();
    table.boolean('enabled').notNullable();
    table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.unique(['org_unit_id', 'module_key']);
    table.index(['tenant_id', 'org_unit_id']);
    table.index(['tenant_id', 'module_key']);
  });

  await knex.schema.withSchema('connectshyft').createTable('cs_number_mappings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('org_unit_id').notNullable().references('id').inTable('platform.org_units').onDelete('CASCADE');
    table.text('twilio_number_e164').notNullable();
    table.text('label').notNullable().defaultTo('');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('updated_by_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE connectshyft.cs_number_mappings
    ADD CONSTRAINT ${NUMBER_MAPPINGS_UNIQUE_NUMBER}
    UNIQUE (tenant_id, twilio_number_e164)
  `);

  await knex.raw(`
    ALTER TABLE connectshyft.cs_number_mappings
    ADD CONSTRAINT ${NUMBER_MAPPINGS_UNIQUE_ID}
    UNIQUE (tenant_id, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS connectshyft_cs_number_mappings_org_unit_idx
    ON connectshyft.cs_number_mappings (tenant_id, org_unit_id, twilio_number_e164, id)
  `);

  await knex.schema.withSchema('platform').createTable('idempotency_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('idempotency_key').notNullable();
    table.string('request_method', 16).notNullable();
    table.text('request_path').notNullable();
    table.uuid('actor_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('tenant_id').references('id').inTable('platform.tenants').onDelete('SET NULL');
    table.text('request_hash').notNullable();
    table.integer('response_http_status').notNullable();
    table.jsonb('response_payload').notNullable();
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE platform.idempotency_requests
    ADD CONSTRAINT ${IDEMPOTENCY_UNIQUE}
    UNIQUE (actor_user_id, idempotency_key, request_method, request_path)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS platform_idempotency_requests_created_idx
    ON platform.idempotency_requests (created_at_utc)
  `);

  await knex.schema.alterTable('users', (table) => {
    table.boolean('must_reset_password').notNullable().defaultTo(false);
    table.boolean('password_set_by_admin').notNullable().defaultTo(false);
  });

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS users_must_reset_password_idx
    ON users (must_reset_password, id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS users_must_reset_password_idx');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('must_reset_password');
    table.dropColumn('password_set_by_admin');
  });

  await knex.raw(`ALTER TABLE platform.idempotency_requests DROP CONSTRAINT IF EXISTS ${IDEMPOTENCY_UNIQUE}`);
  await knex.raw('DROP INDEX IF EXISTS platform.platform_idempotency_requests_created_idx');
  await knex.schema.withSchema('platform').dropTableIfExists('idempotency_requests');

  await knex.raw(`ALTER TABLE connectshyft.cs_number_mappings DROP CONSTRAINT IF EXISTS ${NUMBER_MAPPINGS_UNIQUE_NUMBER}`);
  await knex.raw(`ALTER TABLE connectshyft.cs_number_mappings DROP CONSTRAINT IF EXISTS ${NUMBER_MAPPINGS_UNIQUE_ID}`);
  await knex.raw('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_number_mappings_org_unit_idx');
  await knex.schema.withSchema('connectshyft').dropTableIfExists('cs_number_mappings');

  await knex.schema.withSchema('platform').dropTableIfExists('org_unit_module_overrides');

  await knex.raw('DROP INDEX IF EXISTS platform.platform_org_units_tenant_parent_name_idx');
  await knex.raw('DROP INDEX IF EXISTS platform.platform_org_units_tenant_status_node_type_idx');
  await knex.raw(`ALTER TABLE platform.org_units DROP CONSTRAINT IF EXISTS ${ORG_UNITS_STATUS_CHECK}`);
  await knex.raw('ALTER TABLE platform.org_units DROP COLUMN IF EXISTS archived_by_user_id');
  await knex.raw('ALTER TABLE platform.org_units DROP COLUMN IF EXISTS archived_at_utc');
  await knex.raw('ALTER TABLE platform.org_units DROP COLUMN IF EXISTS node_type');

  await knex.raw(`ALTER TABLE platform.tenant_structure_rules DROP CONSTRAINT IF EXISTS ${TENANT_STRUCTURE_RULES_TYPES_CHECK}`);
  await knex.schema.withSchema('platform').dropTableIfExists('tenant_structure_rules');
}
