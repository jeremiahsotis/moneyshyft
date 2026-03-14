import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Table: recurring_transactions
  // Templates for recurring transactions
  await knex.schema.createTable('recurring_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');

    // Template data
    table.uuid('account_id').notNullable()
      .references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('category_id').nullable()
      .references('id').inTable('categories').onDelete('SET NULL');
    table.string('payee', 255).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.text('notes').nullable();

    // Recurrence settings
    table.enum('frequency', ['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable(); // NULL = indefinite
    table.date('next_occurrence').notNullable();

    // Behavior settings
    table.boolean('auto_post').defaultTo(false);
    table.boolean('skip_weekends').defaultTo(false);
    table.integer('advance_notice_days').defaultTo(3);

    // Metadata
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('household_id');
    table.index('account_id');
    table.index('next_occurrence');
    table.index('is_active');
  });

  // Table: recurring_transaction_instances
  // Actual occurrences awaiting approval
  await knex.schema.createTable('recurring_transaction_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');
    table.uuid('recurring_transaction_id').notNullable()
      .references('id').inTable('recurring_transactions').onDelete('CASCADE');

    // Instance data (editable before approval)
    table.uuid('account_id').notNullable()
      .references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('category_id').nullable()
      .references('id').inTable('categories').onDelete('SET NULL');
    table.string('payee', 255).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.text('notes').nullable();
    table.date('due_date').notNullable();

    // Status workflow
    table.enum('status', ['pending', 'approved', 'posted', 'skipped']).defaultTo('pending');
    table.uuid('transaction_id').nullable()
      .references('id').inTable('transactions').onDelete('SET NULL');

    // Action tracking
    table.uuid('approved_by_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable();
    table.timestamp('posted_at').nullable();
    table.uuid('skipped_by_user_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('skipped_at').nullable();
    table.text('skip_reason').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate instances
    table.unique(['recurring_transaction_id', 'due_date']);

    // Indexes
    table.index('household_id');
    table.index('recurring_transaction_id');
    table.index('status');
    table.index('due_date');
  });

  // Table: user_preferences
  // Global recurring transaction settings
  await knex.schema.createTable('user_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.uuid('household_id').notNullable()
      .references('id').inTable('households').onDelete('CASCADE');

    // Recurring transaction defaults
    table.boolean('recurring_auto_approve').defaultTo(false);
    table.boolean('recurring_auto_post').defaultTo(false);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('household_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('recurring_transaction_instances');
  await knex.schema.dropTableIfExists('recurring_transactions');
}
