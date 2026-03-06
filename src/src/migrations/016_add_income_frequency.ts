import type { Knex } from 'knex';

/**
 * Migration 016: Add frequency tracking to income_sources
 *
 * Purpose: Enable automatic extra money detection by distinguishing
 * between expected income (regular paychecks) and irregular income (bonuses, refunds).
 *
 * New fields:
 * - frequency: Payment frequency (hourly, weekly, biweekly, semimonthly, monthly, annually)
 * - expected_day_of_month: For monthly income, which day to expect payment (1-31)
 * - hours_per_week: For hourly workers, used to calculate expected amount
 * - last_payment_date: Tracks last actual payment to calculate next expected date
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('income_sources', (table) => {
    // Add frequency field (nullable for backward compatibility)
    table.enum('frequency', [
      'hourly',
      'weekly',
      'biweekly',
      'semimonthly',
      'monthly',
      'annually'
    ]).nullable();

    // Add expected pay date (day of month for monthly income, 1-31)
    table.integer('expected_day_of_month').nullable();

    // Add hours per week (for hourly calculation)
    table.decimal('hours_per_week', 5, 2).nullable();

    // Add last payment received date (for frequency calculation)
    table.date('last_payment_date').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('income_sources', (table) => {
    table.dropColumn('frequency');
    table.dropColumn('expected_day_of_month');
    table.dropColumn('hours_per_week');
    table.dropColumn('last_payment_date');
  });
}
