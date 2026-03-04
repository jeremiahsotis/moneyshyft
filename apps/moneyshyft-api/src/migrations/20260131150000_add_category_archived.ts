import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasArchived = await knex.schema.hasColumn('categories', 'is_archived');
  if (!hasArchived) {
    await knex.schema.table('categories', (table) => {
      table.boolean('is_archived').notNullable().defaultTo(false);
      table.index(['household_id', 'is_archived']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasArchived = await knex.schema.hasColumn('categories', 'is_archived');
  if (hasArchived) {
    await knex.schema.table('categories', (table) => {
      table.dropIndex(['household_id', 'is_archived']);
      table.dropColumn('is_archived');
    });
  }
}
