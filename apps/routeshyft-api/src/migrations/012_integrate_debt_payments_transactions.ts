import { Knex } from 'knex'

/**
 * Migration: Integrate Debt Payments with Transactions
 *
 * This migration creates the bidirectional link between debt_payments and transactions:
 * - Adds transaction_id FK to debt_payments (payment → transaction link)
 * - Adds debt_id FK to transactions (transaction → debt link)
 *
 * This allows:
 * 1. Recording a debt payment creates a transaction
 * 2. Creating a transaction can automatically record a debt payment
 */

export async function up(knex: Knex): Promise<void> {
  // Add transaction_id FK to debt_payments table
  // This links a debt payment record to the transaction that moved the money
  await knex.schema.alterTable('debt_payments', (table) => {
    table.uuid('transaction_id').nullable()
    table.foreign('transaction_id')
      .references('transactions.id')
      .onDelete('SET NULL') // If transaction deleted, preserve payment history but mark as unlinked
  })

  // Add debt_id FK to transactions table
  // This allows transactions to optionally specify which debt they're paying
  await knex.schema.alterTable('transactions', (table) => {
    table.uuid('debt_id').nullable()
    table.foreign('debt_id')
      .references('debts.id')
      .onDelete('SET NULL') // If debt deleted, preserve transaction but remove debt link
  })
}

export async function down(knex: Knex): Promise<void> {
  // Remove foreign keys and columns in reverse order
  await knex.schema.alterTable('transactions', (table) => {
    table.dropForeign(['debt_id'])
    table.dropColumn('debt_id')
  })

  await knex.schema.alterTable('debt_payments', (table) => {
    table.dropForeign(['transaction_id'])
    table.dropColumn('transaction_id')
  })
}
