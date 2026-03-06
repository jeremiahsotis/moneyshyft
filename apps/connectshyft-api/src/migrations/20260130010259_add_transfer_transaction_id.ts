import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('transactions', (table) => {
        table.uuid('transfer_transaction_id').references('id').inTable('transactions').onDelete('SET NULL');
        table.index('transfer_transaction_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('transactions', (table) => {
        table.dropIndex('transfer_transaction_id');
        table.dropColumn('transfer_transaction_id');
    });
}
