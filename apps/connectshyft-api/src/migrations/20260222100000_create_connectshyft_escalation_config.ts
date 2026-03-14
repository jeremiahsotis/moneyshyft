import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const ESCALATION_CONFIG_TABLE = 'cs_org_unit_escalation_config';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS connectshyft');

  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).createTable(ESCALATION_CONFIG_TABLE, (table) => {
    table.text('tenant_id').notNullable();
    table.text('org_unit_id').notNullable();
    table.integer('escalation_baseline_hours').notNullable().defaultTo(24);
    table.text('primary_org_unit_admin_user_id').notNullable();
    table.text('secondary_org_unit_admin_user_id');
    table.text('tenant_staff_user_id');
    table.timestamp('created_at_utc').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at_utc').notNullable().defaultTo(knex.fn.now());

    table.primary(['tenant_id', 'org_unit_id']);
    table.check('escalation_baseline_hours >= 1 AND escalation_baseline_hours <= 24');
    table.index(['tenant_id']);
    table.index(['org_unit_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(ESCALATION_CONFIG_TABLE);
}
