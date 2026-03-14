import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasMonth = await knex.schema.hasColumn('account_balance_assignments', 'month');
  if (!hasMonth) {
    await knex.schema.table('account_balance_assignments', (table) => {
      table.string('month', 7).nullable();
    });
  }

  // Backfill month from assigned_at or created_at
  await knex.raw(`
    UPDATE account_balance_assignments
    SET month = TO_CHAR(COALESCE(assigned_at, created_at), 'YYYY-MM')
    WHERE month IS NULL
  `);

  await knex.schema.alterTable('account_balance_assignments', (table) => {
    table.string('month', 7).notNullable().alter();
  });

  await knex.schema.table('account_balance_assignments', (table) => {
    table.index(['household_id', 'month']);
    table.index(['household_id', 'month', 'category_id']);
    table.index(['household_id', 'month', 'section_id']);
  });

  // Recalculate assigned_amount for all budget allocations based on month-specific assignments
  await knex.raw(`
    UPDATE budget_allocations AS ba
    SET assigned_amount = (
      COALESCE((
        SELECT SUM(ia.amount)
        FROM income_assignments ia
        JOIN budget_months bm ON bm.id = ba.budget_month_id
        WHERE ia.household_id = bm.household_id
          AND ia.month = TO_CHAR(bm.month, 'YYYY-MM')
          AND ia.category_id = ba.category_id
      ), 0) +
      COALESCE((
        SELECT SUM(aba.amount)
        FROM account_balance_assignments aba
        JOIN budget_months bm ON bm.id = ba.budget_month_id
        WHERE aba.household_id = bm.household_id
          AND aba.month = TO_CHAR(bm.month, 'YYYY-MM')
          AND aba.category_id = ba.category_id
      ), 0)
    )
    WHERE ba.category_id IS NOT NULL
  `);

  await knex.raw(`
    UPDATE budget_allocations AS ba
    SET assigned_amount = (
      COALESCE((
        SELECT SUM(ia.amount)
        FROM income_assignments ia
        JOIN budget_months bm ON bm.id = ba.budget_month_id
        WHERE ia.household_id = bm.household_id
          AND ia.month = TO_CHAR(bm.month, 'YYYY-MM')
          AND ia.section_id = ba.section_id
      ), 0) +
      COALESCE((
        SELECT SUM(aba.amount)
        FROM account_balance_assignments aba
        JOIN budget_months bm ON bm.id = ba.budget_month_id
        WHERE aba.household_id = bm.household_id
          AND aba.month = TO_CHAR(bm.month, 'YYYY-MM')
          AND aba.section_id = ba.section_id
      ), 0)
    )
    WHERE ba.section_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('account_balance_assignments', (table) => {
    table.dropIndex(['household_id', 'month']);
    table.dropIndex(['household_id', 'month', 'category_id']);
    table.dropIndex(['household_id', 'month', 'section_id']);
  });

  await knex.schema.table('account_balance_assignments', (table) => {
    table.dropColumn('month');
  });
}
