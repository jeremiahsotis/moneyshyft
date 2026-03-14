import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add assigned_amount to budget_allocations
  // This tracks actual cash allocated from real income (vs allocated_amount which is the plan)
  const hasAssignedAmount = await knex.schema.hasColumn('budget_allocations', 'assigned_amount');
  if (!hasAssignedAmount) {
    await knex.schema.table('budget_allocations', (table) => {
      table.decimal('assigned_amount', 15, 2).notNullable().defaultTo(0);
    });
  }

  // 2. Create income_assignments table
  // Tracks: "I assigned $500 from paycheck #123 to Rent category on 12/15"
  const hasIncomeAssignments = await knex.schema.hasTable('income_assignments');
  if (!hasIncomeAssignments) {
    await knex.schema.createTable('income_assignments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('household_id').notNullable()
        .references('id').inTable('households').onDelete('CASCADE');
      table.uuid('income_transaction_id').notNullable()
        .references('id').inTable('transactions').onDelete('CASCADE');
      table.string('month', 7).notNullable(); // YYYY-MM format

      // Either category OR section (same pattern as budget_allocations)
      table.uuid('category_id').nullable()
        .references('id').inTable('categories').onDelete('CASCADE');
      table.uuid('section_id').nullable()
        .references('id').inTable('category_sections').onDelete('CASCADE');

      table.decimal('amount', 15, 2).notNullable(); // Amount assigned
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.uuid('created_by_user_id').nullable()
        .references('id').inTable('users').onDelete('SET NULL');

      table.index(['household_id', 'month']);
      table.index(['income_transaction_id']);
      table.index(['category_id']);
      table.index(['section_id']);
    });

    // Add constraint: Either category OR section must be set (not both, not neither)
    await knex.raw(`
      ALTER TABLE income_assignments
      ADD CONSTRAINT income_assignments_category_or_section_check
      CHECK (
        (category_id IS NOT NULL AND section_id IS NULL) OR
        (category_id IS NULL AND section_id IS NOT NULL)
      )
    `);
  }

  // 3. Add income transaction categorization helper
  // Mark transactions as income with a special category type
  const hasIncomeCategory = await knex.schema.hasColumn('categories', 'is_income_category');
  if (!hasIncomeCategory) {
    await knex.schema.table('categories', (table) => {
      table.boolean('is_income_category').notNullable().defaultTo(false);
    });
  }

  // 4. Add due_date to transactions (for bill tracking)
  const hasDueDate = await knex.schema.hasColumn('transactions', 'due_date');
  if (!hasDueDate) {
    await knex.schema.table('transactions', (table) => {
      table.date('due_date').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove in reverse order
  const hasDueDate = await knex.schema.hasColumn('transactions', 'due_date');
  if (hasDueDate) {
    await knex.schema.table('transactions', (table) => {
      table.dropColumn('due_date');
    });
  }

  const hasIncomeCategory = await knex.schema.hasColumn('categories', 'is_income_category');
  if (hasIncomeCategory) {
    await knex.schema.table('categories', (table) => {
      table.dropColumn('is_income_category');
    });
  }

  const hasIncomeAssignments = await knex.schema.hasTable('income_assignments');
  if (hasIncomeAssignments) {
    // Drop constraint before dropping table
    await knex.raw('ALTER TABLE income_assignments DROP CONSTRAINT IF EXISTS income_assignments_category_or_section_check');

    await knex.schema.dropTableIfExists('income_assignments');
  }

  const hasAssignedAmount = await knex.schema.hasColumn('budget_allocations', 'assigned_amount');
  if (hasAssignedAmount) {
    await knex.schema.table('budget_allocations', (table) => {
      table.dropColumn('assigned_amount');
    });
  }
}
