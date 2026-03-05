import type { Knex } from 'knex';

/**
 * Migration 015: Create Extra Money Preferences Table
 *
 * This table stores household-level percentage preferences for how to allocate
 * irregular income (bonuses, tax refunds, gifts). Uses JSON columns for flexibility:
 * - category_percentages: Maps category_id -> percentage (0.00-1.00)
 * - default_categories: Maps default types ("giving", "debt", etc.) -> category_id
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('extra_money_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().unique();

    // JSON mapping: { category_id_uuid: decimal_percentage }
    // Example: { "uuid-123": 0.10, "uuid-456": 0.30, "uuid-xyz": 0.20 }
    table.jsonb('category_percentages').notNullable();

    // JSON mapping of default category types to category IDs
    // Example: { "giving": "uuid-123", "debt": "uuid-456", "fun": "uuid-xyz" }
    table.jsonb('default_categories').notNullable();

    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    // Foreign keys
    table.foreign('household_id').references('households.id').onDelete('CASCADE');

    // Indexes
    table.index('household_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('extra_money_preferences');
}
