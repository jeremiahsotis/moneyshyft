import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create debts table
  await knex.schema.createTable('debts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');

    // Basic information
    table.string('name', 255).notNullable(); // e.g., "Capital One Visa", "Honda CR-V Loan"
    table.string('debt_type', 50).notNullable(); // credit_card, auto_loan, student_loan, personal_loan, medical, other

    // Financial details
    table.decimal('current_balance', 15, 2).notNullable(); // How much is owed now
    table.decimal('original_balance', 15, 2); // Original amount borrowed (optional, for progress tracking)
    table.decimal('interest_rate', 5, 2).notNullable(); // APR as percentage (18.99 for 18.99%)
    table.decimal('minimum_payment', 15, 2).notNullable(); // Minimum monthly payment

    // Budget integration
    table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL'); // Link to budget category

    // Status tracking
    table.boolean('is_paid_off').notNullable().defaultTo(false);
    table.timestamp('paid_off_at');

    // Metadata
    table.text('notes');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['household_id']);
    table.index(['household_id', 'is_paid_off']);
  });

  // Create debt_payments table (similar to goal_contributions)
  await knex.schema.createTable('debt_payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('debt_id').notNullable()
      .references('id').inTable('debts').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL'); // Who made the payment

    table.decimal('amount', 15, 2).notNullable(); // Payment amount
    table.date('payment_date').notNullable(); // When the payment was made
    table.text('notes');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['debt_id']);
    table.index(['payment_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('debt_payments');
  await knex.schema.dropTableIfExists('debts');
}
