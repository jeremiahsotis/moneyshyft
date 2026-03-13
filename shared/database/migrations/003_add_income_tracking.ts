import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create income_sources table
  await knex.schema.createTable('income_sources', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable(); // e.g., "Primary Job", "Side Gig"
    table.decimal('monthly_amount', 15, 2).notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.text('notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['household_id']);
  });

  // Add wizard completion tracking to households table
  await knex.schema.table('households', (table) => {
    table.boolean('setup_wizard_completed').notNullable().defaultTo(false);
    table.timestamp('setup_wizard_completed_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('income_sources');
  await knex.schema.table('households', (table) => {
    table.dropColumn('setup_wizard_completed');
    table.dropColumn('setup_wizard_completed_at');
  });
}
