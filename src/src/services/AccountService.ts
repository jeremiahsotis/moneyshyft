import knex from '../config/knex';
import { NotFoundError } from '../middleware/errorHandler';
import type { Knex } from 'knex';
import logger from '../utils/logger';

interface Account {
  id: string;
  household_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  current_balance: number;
  starting_balance: number;
  is_active: boolean;
  previous_balance_at_start?: number;
  month_start_date?: Date;
  created_at: Date;
  updated_at: Date;
}

interface CreateAccountData {
  name: string;
  type: Account['type'];
  starting_balance?: number;
  is_active?: boolean;
}

interface UpdateAccountData {
  name?: string;
  is_active?: boolean;
}

export class AccountService {
  /**
   * Get all accounts for a household
   */
  static async getAllAccounts(householdId: string): Promise<Account[]> {
    const accounts = await knex('accounts')
      .where({ household_id: householdId })
      .orderBy('created_at', 'asc');

    return accounts;
  }

  /**
   * Get a single account by ID
   */
  static async getAccountById(
    accountId: string,
    householdId: string,
    trx: Knex | Knex.Transaction = knex
  ): Promise<Account> {
    const account = await trx('accounts')
      .where({ id: accountId, household_id: householdId })
      .first();

    if (!account) {
      throw new NotFoundError('Account not found');
    }

    return account;
  }

  /**
   * Create a new account
   */
  static async createAccount(
    householdId: string,
    data: CreateAccountData
  ): Promise<Account> {
    const { name, type, starting_balance = 0, is_active = true } = data;

    // Initialize credit card tracking fields if this is a credit card account
    // If starting with existing debt (negative balance), treat it as previous balance
    const creditCardFields = type === 'credit' ? {
      previous_balance_at_start: starting_balance < 0 ? Math.abs(starting_balance) : 0,
      month_start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    } : {};

    const [account] = await knex('accounts')
      .insert({
        household_id: householdId,
        name,
        type,
        current_balance: starting_balance,
        starting_balance,
        is_active,
        ...creditCardFields
      })
      .returning('*');

    logger.info(`Account created: ${account.id} for household: ${householdId}`);

    return account;
  }

  /**
   * Update an account
   */
  static async updateAccount(
    accountId: string,
    householdId: string,
    data: UpdateAccountData
  ): Promise<Account> {
    // Check if account exists and belongs to household
    await this.getAccountById(accountId, householdId);

    const [updatedAccount] = await knex('accounts')
      .where({ id: accountId, household_id: householdId })
      .update({
        ...data,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Account updated: ${accountId}`);

    return updatedAccount;
  }

  /**
   * Delete an account (soft delete by marking inactive)
   */
  static async deleteAccount(accountId: string, householdId: string): Promise<void> {
    // Check if account exists and belongs to household
    await this.getAccountById(accountId, householdId);

    // Check if account has transactions
    const transactionCount = await knex('transactions')
      .where({ account_id: accountId })
      .count('id as count')
      .first();

    if (transactionCount && Number(transactionCount.count) > 0) {
      // Soft delete - mark as inactive instead of deleting
      await knex('accounts')
        .where({ id: accountId, household_id: householdId })
        .update({
          is_active: false,
          updated_at: knex.fn.now()
        });

      logger.info(`Account soft deleted (marked inactive): ${accountId}`);
    } else {
      // Hard delete if no transactions
      await knex('accounts')
        .where({ id: accountId, household_id: householdId })
        .del();

      logger.info(`Account hard deleted: ${accountId}`);
    }
  }

  /**
   * Get account balance history (for future analytics)
   */
  static async getAccountBalance(accountId: string, householdId: string): Promise<number> {
    const account = await this.getAccountById(accountId, householdId);
    return Number(account.current_balance);
  }

  /**
   * Update account balance (called after transaction changes)
   * This recalculates balance from transactions
   */
  static async recalculateBalance(
    accountId: string,
    householdId: string,
    trx: Knex | Knex.Transaction = knex
  ): Promise<void> {
    const account = await this.getAccountById(accountId, householdId, trx);

    // Calculate sum of all transactions for this account
    const result = await trx('transactions')
      .where({ account_id: accountId, household_id: householdId, is_split_child: false })
      .sum('amount as total')
      .first();

    const transactionTotal = Number(result?.total || 0);
    const newBalance = Number(account.starting_balance) + transactionTotal;

    await trx('accounts')
      .where({ id: accountId })
      .update({
        current_balance: newBalance,
        updated_at: trx.fn.now()
      });

    logger.info(`Account balance recalculated: ${accountId}, new balance: ${newBalance}`);
  }
}
