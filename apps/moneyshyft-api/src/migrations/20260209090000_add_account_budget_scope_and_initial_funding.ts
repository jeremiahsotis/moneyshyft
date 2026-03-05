import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasIsOnBudget = await knex.schema.hasColumn('accounts', 'is_on_budget');

  if (!hasIsOnBudget) {
    await knex.schema.alterTable('accounts', (table: Knex.CreateTableBuilder) => {
      table.boolean('is_on_budget').notNullable().defaultTo(true);
      table.index(['household_id', 'is_on_budget']);
    });
  }

  await knex.transaction(async (trx: Knex.Transaction) => {
    // Convert persisted starting balances into explicit one-time transactions.
    // This preserves account history and prevents recurring use of starting_balance in RTA math.
    await trx.raw(`
      INSERT INTO transactions (
        id,
        household_id,
        account_id,
        category_id,
        payee,
        amount,
        transaction_date,
        notes,
        is_cleared,
        is_reconciled,
        created_by_user_id,
        parent_transaction_id,
        is_split_child,
        transfer_transaction_id,
        created_at,
        updated_at
      )
      SELECT
        uuid_generate_v4(),
        a.household_id,
        a.id,
        NULL,
        'Initial Funding',
        a.starting_balance,
        COALESCE(DATE(a.created_at), CURRENT_DATE),
        'Migrated from account starting balance',
        false,
        false,
        NULL,
        NULL,
        false,
        NULL,
        NOW(),
        NOW()
      FROM accounts a
      WHERE COALESCE(a.starting_balance, 0) <> 0
        AND NOT EXISTS (
          SELECT 1
          FROM transactions t
          WHERE t.account_id = a.id
            AND t.payee = 'Initial Funding'
            AND t.notes = 'Migrated from account starting balance'
        );
    `);

    await trx('accounts').update({
      starting_balance: 0,
      updated_at: trx.fn.now(),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.transaction(async (trx: Knex.Transaction) => {
    await trx('transactions')
      .where({ payee: 'Initial Funding', notes: 'Migrated from account starting balance' })
      .del();

    await trx('accounts')
      .where({ starting_balance: 0 })
      .update({
        // We cannot reliably restore original starting balances from historical data in down migration.
        // Leave values at 0 to keep data consistent.
        updated_at: trx.fn.now(),
      });
  });

  const hasIsOnBudget = await knex.schema.hasColumn('accounts', 'is_on_budget');
  if (hasIsOnBudget) {
    await knex.schema.alterTable('accounts', (table: Knex.CreateTableBuilder) => {
      table.dropIndex(['household_id', 'is_on_budget']);
      table.dropColumn('is_on_budget');
    });
  }
}
