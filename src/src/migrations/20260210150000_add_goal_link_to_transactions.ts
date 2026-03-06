import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasGoalId = await knex.schema.hasColumn('transactions', 'goal_id');

  if (!hasGoalId) {
    await knex.schema.alterTable('transactions', (table) => {
      table.uuid('goal_id').nullable();
      table.foreign('goal_id').references('goals.id').onDelete('SET NULL');
      table.index('goal_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasGoalId = await knex.schema.hasColumn('transactions', 'goal_id');

  if (hasGoalId) {
    await knex.schema.alterTable('transactions', (table) => {
      table.dropIndex(['goal_id']);
      table.dropForeign(['goal_id']);
      table.dropColumn('goal_id');
    });
  }
}
