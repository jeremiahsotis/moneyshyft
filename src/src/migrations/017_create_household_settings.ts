import type { Knex } from 'knex';

/**
 * Migration 017: Create household_settings table
 *
 * Purpose: Store household-level configuration preferences, starting with
 * extra money detection threshold. This allows users to customize when
 * they want to be prompted about irregular income.
 *
 * Initial setting:
 * - extra_money_threshold: Minimum amount ($) to trigger detection (default: $100)
 *
 * Future settings can be added here without additional migrations.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('household_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().unique();

    // Extra money detection threshold (default $100)
    // Users won't be prompted for irregular income below this amount
    table.decimal('extra_money_threshold', 10, 2).defaultTo(100.00);

    // Future settings can be added here:
    // - notification preferences
    // - privacy settings
    // - display preferences
    // etc.

    table.timestamps(true, true);

    table.foreign('household_id').references('households.id').onDelete('CASCADE');
    table.index('household_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('household_settings');
}
