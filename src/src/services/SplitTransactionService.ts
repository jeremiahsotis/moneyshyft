import knex from '../config/knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { AccountService } from './AccountService';
import logger from '../utils/logger';

interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  tag_id?: string | null;
  payee: string;
  amount: number;
  transaction_date: Date;
  notes: string | null;
  is_cleared: boolean;
  is_reconciled: boolean;
  created_by_user_id: string | null;
  parent_transaction_id: string | null;
  is_split_child: boolean;
  created_at: Date;
  updated_at: Date;
}

interface SplitData {
  category_id: string;
  amount: number;
  notes?: string | null;
}

interface SplitResult {
  parent: Transaction;
  splits: Transaction[];
}

export class SplitTransactionService {
  /**
   * Validate that split amounts sum exactly to parent amount
   */
  static validateSplitSum(parentAmount: number, splits: SplitData[]): void {
    // Minimum 2 splits required
    if (splits.length < 2) {
      throw new BadRequestError('At least 2 splits are required');
    }

    // All splits must have non-zero amounts (can be positive for income or negative for expenses)
    splits.forEach((split, index) => {
      if (split.amount === 0) {
        throw new BadRequestError(`Split ${index + 1} cannot have a zero amount`);
      }
      // Check that all splits have the same sign as parent (all income or all expense)
      if (Math.sign(split.amount) !== Math.sign(parentAmount)) {
        throw new BadRequestError(
          `Split ${index + 1} sign does not match parent transaction (${parentAmount < 0 ? 'expense' : 'income'})`
        );
      }
    });

    // Calculate sum with proper decimal handling
    const sum = splits.reduce((acc, split) => {
      return Math.round((acc + split.amount) * 100) / 100;
    }, 0);

    const parentAmountRounded = Math.round(parentAmount * 100) / 100;

    if (Math.abs(sum - parentAmountRounded) > 0.01) {
      throw new BadRequestError(
        `Split amounts (${sum}) must equal parent amount (${parentAmountRounded})`
      );
    }
  }

  /**
   * Convert an existing transaction into a split transaction
   */
  static async createSplits(
    transactionId: string,
    householdId: string,
    userId: string,
    splits: SplitData[]
  ): Promise<SplitResult> {
    return await knex.transaction(async (trx) => {
      // Get parent transaction
      const parent = await trx('transactions')
        .where({ id: transactionId, household_id: householdId })
        .first();

      if (!parent) {
        throw new NotFoundError('Transaction not found');
      }

      // Prevent splitting a transaction that's already a split child
      if (parent.is_split_child) {
        throw new BadRequestError('Cannot split a transaction that is already part of a split');
      }

      // Prevent splitting a transaction that's already been split
      const existingSplits = await trx('transactions')
        .where({ parent_transaction_id: transactionId })
        .count('* as count')
        .first();

      if (existingSplits && parseInt(existingSplits.count as string) > 0) {
        throw new BadRequestError('Transaction has already been split. Use updateSplits to modify.');
      }

      // Validate splits
      this.validateSplitSum(parent.amount, splits);

      // Verify all categories belong to household
      for (const split of splits) {
        const category = await trx('categories')
          .where({ id: split.category_id, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError(
            `Category ${split.category_id} not found or does not belong to this household`
          );
        }
      }

      // Update parent transaction - clear its category since it's now split
      const [updatedParent] = await trx('transactions')
        .where({ id: transactionId })
        .update({
          category_id: null,
          updated_at: trx.fn.now()
        })
        .returning('*');

      const parentTag = await trx('transaction_tags')
        .where({ transaction_id: transactionId })
        .first();
      updatedParent.tag_id = parentTag?.tag_id || null;

      // Create split child transactions
      const splitTransactions: Transaction[] = [];
      for (const split of splits) {
        const [childTransaction] = await trx('transactions')
          .insert({
            household_id: householdId,
            account_id: parent.account_id,
            category_id: split.category_id,
            payee: parent.payee,
            amount: split.amount,
            transaction_date: parent.transaction_date,
            notes: split.notes || null,
            is_cleared: parent.is_cleared,
            is_reconciled: parent.is_reconciled,
            created_by_user_id: userId,
            parent_transaction_id: transactionId,
            is_split_child: true
          })
          .returning('*');

        splitTransactions.push(childTransaction);
      }

      logger.info(
        `Transaction ${transactionId} split into ${splits.length} child transactions`
      );

      return {
        parent: updatedParent,
        splits: splitTransactions
      };
    });
  }

  /**
   * Get all split children for a parent transaction
   */
  static async getSplits(
    transactionId: string,
    householdId: string
  ): Promise<SplitResult> {
    // Get parent transaction
    const parent = await knex('transactions')
      .where({ id: transactionId, household_id: householdId })
      .first();

    if (!parent) {
      throw new NotFoundError('Transaction not found');
    }

    // Get split children
    const splits = await knex('transactions')
      .where({ parent_transaction_id: transactionId, household_id: householdId })
      .orderBy('created_at', 'asc');

    const parentTag = await knex('transaction_tags')
      .where({ transaction_id: transactionId })
      .first();
    parent.tag_id = parentTag?.tag_id || null;

    return {
      parent,
      splits
    };
  }

  /**
   * Update existing splits (add/remove/modify)
   */
  static async updateSplits(
    transactionId: string,
    householdId: string,
    userId: string,
    splits: SplitData[]
  ): Promise<SplitResult> {
    return await knex.transaction(async (trx) => {
      // Get parent transaction
      const parent = await trx('transactions')
        .where({ id: transactionId, household_id: householdId })
        .first();

      if (!parent) {
        throw new NotFoundError('Transaction not found');
      }

      // Validate splits
      this.validateSplitSum(parent.amount, splits);

      // Verify all categories belong to household
      for (const split of splits) {
        const category = await trx('categories')
          .where({ id: split.category_id, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError(
            `Category ${split.category_id} not found or does not belong to this household`
          );
        }
      }

      // Delete all existing split children
      await trx('transactions')
        .where({ parent_transaction_id: transactionId })
        .delete();

      // Create new split children
      const splitTransactions: Transaction[] = [];
      for (const split of splits) {
        const [childTransaction] = await trx('transactions')
          .insert({
            household_id: householdId,
            account_id: parent.account_id,
            category_id: split.category_id,
            payee: parent.payee,
            amount: split.amount,
            transaction_date: parent.transaction_date,
            notes: split.notes || null,
            is_cleared: parent.is_cleared,
            is_reconciled: parent.is_reconciled,
            created_by_user_id: userId,
            parent_transaction_id: transactionId,
            is_split_child: true
          })
          .returning('*');

        splitTransactions.push(childTransaction);
      }

      // Update parent's updated_at timestamp
      const [updatedParent] = await trx('transactions')
        .where({ id: transactionId })
        .update({ updated_at: trx.fn.now() })
        .returning('*');

      const parentTag = await trx('transaction_tags')
        .where({ transaction_id: transactionId })
        .first();
      updatedParent.tag_id = parentTag?.tag_id || null;

      logger.info(
        `Transaction ${transactionId} splits updated to ${splits.length} children`
      );

      return {
        parent: updatedParent,
        splits: splitTransactions
      };
    });
  }

  /**
   * Unsplit a transaction (merge back to single transaction)
   */
  static async unsplitTransaction(
    transactionId: string,
    householdId: string,
    categoryId?: string | null
  ): Promise<Transaction> {
    return await knex.transaction(async (trx) => {
      // Get parent transaction
      const parent = await trx('transactions')
        .where({ id: transactionId, household_id: householdId })
        .first();

      if (!parent) {
        throw new NotFoundError('Transaction not found');
      }

      // Verify the transaction actually has splits
      const splits = await trx('transactions')
        .where({ parent_transaction_id: transactionId })
        .count('* as count')
        .first();

      if (!splits || parseInt(splits.count as string) === 0) {
        throw new BadRequestError('Transaction is not currently split');
      }

      // If category provided, verify it belongs to household
      if (categoryId) {
        const category = await trx('categories')
          .where({ id: categoryId, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError('Category not found or does not belong to this household');
        }
      }

      // Delete all split children (CASCADE handles this, but explicit is clearer)
      await trx('transactions')
        .where({ parent_transaction_id: transactionId })
        .delete();

      // Restore parent transaction's category
      const [unsplitTransaction] = await trx('transactions')
        .where({ id: transactionId })
        .update({
          category_id: categoryId || null,
          updated_at: trx.fn.now()
        })
        .returning('*');

      const parentTag = await trx('transaction_tags')
        .where({ transaction_id: transactionId })
        .first();
      unsplitTransaction.tag_id = parentTag?.tag_id || null;

      logger.info(`Transaction ${transactionId} unsplit and restored`);

      return unsplitTransaction;
    });
  }

  /**
   * Check if a transaction is split
   */
  static async isSplit(transactionId: string, householdId: string): Promise<boolean> {
    const splits = await knex('transactions')
      .where({ parent_transaction_id: transactionId, household_id: householdId })
      .count('* as count')
      .first();

    return splits ? parseInt(splits.count as string) > 0 : false;
  }
}
