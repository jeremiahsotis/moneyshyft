import { Knex } from 'knex';

/**
 * Migration: Update category section types
 *
 * Changes section types from 'spending' | 'savings' to 'fixed' | 'flexible' | 'debt'
 *
 * Migration strategy:
 * - 'spending' → 'fixed' (essential expenses like rent, utilities)
 * - 'savings' → 'flexible' (variable spending that can be adjusted)
 * - 'debt' is new type for debt payment tracking
 */
export async function up(knex: Knex): Promise<void> {
  // First, migrate existing data before changing constraint
  await knex.raw(`
    UPDATE category_sections
    SET type = 'fixed'
    WHERE type = 'spending'
  `);

  await knex.raw(`
    UPDATE category_sections
    SET type = 'flexible'
    WHERE type = 'savings'
  `);

  // Drop the old constraint
  await knex.raw(`
    ALTER TABLE category_sections
    DROP CONSTRAINT IF EXISTS category_sections_type_check
  `);

  // Add new constraint with three types
  await knex.raw(`
    ALTER TABLE category_sections
    ADD CONSTRAINT category_sections_type_check
    CHECK (type IN ('fixed', 'flexible', 'debt'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Note: Downgrade will lose 'debt' section type data

  // Migrate back to old types (debt → spending as fallback)
  await knex.raw(`
    UPDATE category_sections
    SET type = 'spending'
    WHERE type IN ('fixed', 'debt')
  `);

  await knex.raw(`
    UPDATE category_sections
    SET type = 'savings'
    WHERE type = 'flexible'
  `);

  // Drop new constraint
  await knex.raw(`
    ALTER TABLE category_sections
    DROP CONSTRAINT IF EXISTS category_sections_type_check
  `);

  // Restore old constraint
  await knex.raw(`
    ALTER TABLE category_sections
    ADD CONSTRAINT category_sections_type_check
    CHECK (type IN ('spending', 'savings'))
  `);
}
