import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create extra_money_entries table
  await knex.schema.createTable('extra_money_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable();
    table.uuid('transaction_id').nullable(); // Optional link to income transaction
    table.string('source', 100).notNullable(); // e.g., "Bonus", "Tax Refund", "Gift"
    table.decimal('amount', 12, 2).notNullable();
    table.date('received_date').notNullable();
    table.text('notes').nullable();

    // Detection metadata
    table.boolean('auto_detected').defaultTo(false); // Was this detected by algorithm?
    table.string('detection_reason', 255).nullable(); // Why was it flagged as extra money?

    // Assignment tracking
    table.enum('status', ['pending', 'assigned', 'ignored']).defaultTo('pending');
    table.timestamp('assigned_at').nullable();
    table.uuid('assigned_by_user_id').nullable();

    // Foreign keys
    table.foreign('household_id').references('households.id').onDelete('CASCADE');
    table.foreign('transaction_id').references('transactions.id').onDelete('SET NULL');
    table.foreign('assigned_by_user_id').references('users.id').onDelete('SET NULL');

    table.timestamps(true, true);

    // Indexes
    table.index('household_id');
    table.index('status');
    table.index('received_date');
  });

  // Create junction table for extra money assignments to categories
  await knex.schema.createTable('extra_money_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('extra_money_entry_id').notNullable();
    table.uuid('category_id').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.uuid('assigned_by_user_id').notNullable();

    // Foreign keys
    table.foreign('extra_money_entry_id').references('extra_money_entries.id').onDelete('CASCADE');
    table.foreign('category_id').references('categories.id').onDelete('CASCADE');
    table.foreign('assigned_by_user_id').references('users.id').onDelete('SET NULL');

    table.timestamps(true, true);

    // Indexes
    table.index('extra_money_entry_id');
    table.index('category_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('extra_money_assignments');
  await knex.schema.dropTableIfExists('extra_money_entries');
}
