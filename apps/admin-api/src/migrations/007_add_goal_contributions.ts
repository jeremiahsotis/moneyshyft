import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add transaction_id column to existing goal_contributions table
  const hasTransactionId = await knex.schema.hasColumn('goal_contributions', 'transaction_id');

  if (!hasTransactionId) {
    await knex.schema.table('goal_contributions', (table) => {
      table.uuid('transaction_id').nullable().references('id').inTable('transactions').onDelete('CASCADE');
      table.index('transaction_id');
    });

    console.log('✅ Added transaction_id to goal_contributions table');
  } else {
    console.log('ℹ️  transaction_id already exists in goal_contributions table');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTransactionId = await knex.schema.hasColumn('goal_contributions', 'transaction_id');

  if (hasTransactionId) {
    await knex.schema.table('goal_contributions', (table) => {
      table.dropColumn('transaction_id');
    });
  }
}
