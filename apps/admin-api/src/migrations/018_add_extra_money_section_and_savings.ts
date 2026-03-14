import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('extra_money_entries', (table) => {
    table.decimal('savings_reserve', 12, 2).notNullable().defaultTo(0);
  });

  await knex.schema.table('extra_money_assignments', (table) => {
    table.uuid('section_id').nullable();
    table.uuid('category_id').nullable().alter();
  });

  await knex.schema.table('extra_money_assignments', (table) => {
    table.foreign('section_id').references('category_sections.id').onDelete('CASCADE');
    table.index('section_id');
  });

  await knex.raw(`
    ALTER TABLE extra_money_assignments
    ADD CONSTRAINT extra_money_assignments_category_or_section_check
    CHECK (
      (category_id IS NOT NULL AND section_id IS NULL) OR
      (category_id IS NULL AND section_id IS NOT NULL)
    )
  `);

  await knex.schema.table('extra_money_preferences', (table) => {
    table.jsonb('section_percentages').notNullable().defaultTo('{}');
    table.jsonb('default_sections').notNullable().defaultTo('{}');
    table.decimal('reserve_percentage', 5, 4).notNullable().defaultTo(0);
  });

  await knex.schema.createTable('extra_money_goal_allocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('extra_money_entry_id').notNullable();
    table.uuid('goal_id').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.uuid('assigned_by_user_id').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.foreign('extra_money_entry_id').references('extra_money_entries.id').onDelete('CASCADE');
    table.foreign('goal_id').references('goals.id').onDelete('CASCADE');
    table.foreign('assigned_by_user_id').references('users.id').onDelete('SET NULL');

    table.index('extra_money_entry_id');
    table.index('goal_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('extra_money_goal_allocations');

  await knex.schema.table('extra_money_preferences', (table) => {
    table.dropColumn('section_percentages');
    table.dropColumn('default_sections');
    table.dropColumn('reserve_percentage');
  });

  await knex.raw('ALTER TABLE extra_money_assignments DROP CONSTRAINT IF EXISTS extra_money_assignments_category_or_section_check');

  await knex.schema.table('extra_money_assignments', (table) => {
    table.dropIndex(['section_id']);
    table.dropColumn('section_id');
    table.uuid('category_id').notNullable().alter();
  });

  await knex.schema.table('extra_money_entries', (table) => {
    table.dropColumn('savings_reserve');
  });
}
