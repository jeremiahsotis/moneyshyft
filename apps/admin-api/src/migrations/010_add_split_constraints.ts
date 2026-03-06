import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add constraint to ensure split children always have a parent,
  // and non-split transactions don't have a parent
  await knex.raw(`
    ALTER TABLE transactions
    ADD CONSTRAINT split_child_must_have_parent
    CHECK (
      (is_split_child = false AND parent_transaction_id IS NULL) OR
      (is_split_child = true AND parent_transaction_id IS NOT NULL)
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove the constraint
  await knex.raw(`
    ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS split_child_must_have_parent
  `);
}
