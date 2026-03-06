import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ===========================
  // HOUSEHOLDS & USERS
  // ===========================

  await knex.schema.createTable('households', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.uuid('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.string('role', 50).notNullable().defaultTo('member'); // 'admin' or 'member'
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_login_at');

    table.index('household_id');
    table.index('email');
  });

  await knex.schema.createTable('household_invitations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('email', 255).notNullable();
    table.uuid('invited_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.string('status', 50).notNullable().defaultTo('pending'); // 'pending', 'accepted', 'expired'
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // ===========================
  // ACCOUNTS
  // ===========================

  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('type', 50).notNullable(); // 'checking', 'savings', 'credit', 'cash', 'investment'
    table.decimal('current_balance', 15, 2).notNullable().defaultTo(0);
    table.decimal('starting_balance', 15, 2).notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);

    // Credit card specific fields
    table.decimal('previous_balance_at_start', 15, 2); // For credit card tracking
    table.date('month_start_date'); // When the tracking month started

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
  });

  // ===========================
  // CATEGORIES & SECTIONS
  // ===========================

  await knex.schema.createTable('category_sections', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('type', 50).notNullable(); // 'spending' or 'savings'
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_system').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
  });

  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.uuid('section_id').references('id').inTable('category_sections').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.uuid('parent_category_id').references('id').inTable('categories').onDelete('CASCADE'); // For subcategories
    table.string('color', 7); // Hex color code like #FF5733
    table.string('icon', 50); // Icon identifier
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_system').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
  });

  // ===========================
  // TRANSACTIONS
  // ===========================

  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
    table.string('payee', 255).notNullable();
    table.decimal('amount', 15, 2).notNullable(); // Positive for income, negative for expenses
    table.date('transaction_date').notNullable();
    table.text('notes');
    table.boolean('is_cleared').notNullable().defaultTo(false);
    table.boolean('is_reconciled').notNullable().defaultTo(false);
    table.uuid('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');

    // For future split transaction support (Phase 3)
    table.uuid('parent_transaction_id').references('id').inTable('transactions').onDelete('CASCADE');
    table.boolean('is_split_child').notNullable().defaultTo(false);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
    table.index('account_id');
    table.index('transaction_date');
    table.index('category_id');
  });

  // ===========================
  // BUDGETS
  // ===========================

  await knex.schema.createTable('budget_months', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.date('month').notNullable(); // First day of the month
    table.text('notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['household_id', 'month']);
  });

  await knex.schema.createTable('budget_allocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('budget_month_id').notNullable().references('id').inTable('budget_months').onDelete('CASCADE');
    table.uuid('category_id').references('id').inTable('categories').onDelete('CASCADE');
    table.uuid('section_id').references('id').inTable('category_sections').onDelete('CASCADE');
    table.decimal('allocated_amount', 15, 2).notNullable().defaultTo(0);
    table.boolean('rollup_mode').notNullable().defaultTo(false); // If true, allocation is at section level
    table.text('notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('budget_month_id');

    // Constraint: either category_id or section_id must be set, not both
    table.check(`
      (category_id IS NOT NULL AND section_id IS NULL AND rollup_mode = false) OR
      (section_id IS NOT NULL AND category_id IS NULL AND rollup_mode = true)
    `);
  });

  // ===========================
  // GOALS
  // ===========================

  await knex.schema.createTable('goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.decimal('target_amount', 15, 2).notNullable();
    table.decimal('current_amount', 15, 2).notNullable().defaultTo(0);
    table.date('target_date');
    table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL'); // Link to savings category
    table.boolean('is_completed').notNullable().defaultTo(false);
    table.timestamp('completed_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('household_id');
  });

  await knex.schema.createTable('goal_contributions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('goal_id').notNullable().references('id').inTable('goals').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL'); // For Phase 4: individual contributions
    table.decimal('amount', 15, 2).notNullable();
    table.date('contribution_date').notNullable();
    table.text('notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order (respecting foreign key constraints)
  await knex.schema.dropTableIfExists('goal_contributions');
  await knex.schema.dropTableIfExists('goals');
  await knex.schema.dropTableIfExists('budget_allocations');
  await knex.schema.dropTableIfExists('budget_months');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('category_sections');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('household_invitations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('households');
}
