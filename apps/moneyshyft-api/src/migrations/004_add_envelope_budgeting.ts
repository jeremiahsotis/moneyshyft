import { Knex } from 'knex';

// Compatibility shim: older environments recorded this migration name in knex_migrations.
// The actual schema changes now live in 009_add_envelope_budgeting.ts.
export async function up(_knex: Knex): Promise<void> {
  return;
}

export async function down(_knex: Knex): Promise<void> {
  return;
}
