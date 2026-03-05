import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSectionId = await knex.schema.hasColumn('account_balance_assignments', 'section_id');
  if (!hasSectionId) {
    await knex.schema.table('account_balance_assignments', (table) => {
      table.uuid('section_id').nullable();
    });
  }

  const hasCategoryNullable = await knex.schema.hasColumn('account_balance_assignments', 'category_id');
  if (hasCategoryNullable) {
    await knex.schema.table('account_balance_assignments', (table) => {
      table.uuid('category_id').nullable().alter();
    });
  }

  await knex.schema.table('account_balance_assignments', (table) => {
    table.foreign('section_id').references('category_sections.id').onDelete('CASCADE');
    table.index('section_id');
  });

  await knex.raw(`
    ALTER TABLE account_balance_assignments
    ADD CONSTRAINT account_balance_assignments_category_or_section_check
    CHECK (
      (category_id IS NOT NULL AND section_id IS NULL) OR
      (category_id IS NULL AND section_id IS NOT NULL)
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE account_balance_assignments DROP CONSTRAINT IF EXISTS account_balance_assignments_category_or_section_check');

  await knex.schema.table('account_balance_assignments', (table) => {
    table.dropIndex(['section_id']);
    table.dropForeign(['section_id']);
    table.dropColumn('section_id');
    table.uuid('category_id').notNullable().alter();
  });
}
