import { Knex } from 'knex'

/**
 * Migration: Add Account Balance Assignments
 *
 * This migration creates infrastructure to track when account balances are initially
 * assigned to budget categories. This is separate from regular income-based assignments
 * and represents "initial capital" or "found money" being allocated to the budget.
 *
 * Use cases:
 * - During wizard setup: User assigns their checking account balance across categories
 * - Adding new account later: User assigns spouse's account balance to budget
 * - One-time capital events: Tax refund, inheritance, etc.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('account_balance_assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    table.uuid('household_id').notNullable()
    table.uuid('account_id').nullable()  // Nullable - can assign without specific account
    table.uuid('category_id').notNullable()
    table.decimal('amount', 12, 2).notNullable()  // How much of balance assigned
    table.timestamp('assigned_at').defaultTo(knex.fn.now())
    table.uuid('assigned_by_user_id').nullable()

    // Foreign keys
    table.foreign('household_id').references('households.id').onDelete('CASCADE')
    table.foreign('account_id').references('accounts.id').onDelete('CASCADE')
    table.foreign('category_id').references('categories.id').onDelete('CASCADE')
    table.foreign('assigned_by_user_id').references('users.id').onDelete('SET NULL')

    // Timestamps
    table.timestamps(true, true)

    // Index for queries
    table.index(['household_id', 'category_id'])
    table.index('account_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('account_balance_assignments')
}
