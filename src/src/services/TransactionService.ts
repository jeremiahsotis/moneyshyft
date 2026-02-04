import knex from '../config/knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import type { Knex } from 'knex';
import { AccountService } from './AccountService';
import { ExtraMoneyService, type ExtraMoneyEntry } from './ExtraMoneyService';
import { AnalyticsService } from './AnalyticsService';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  tag_id?: string | null;
  debt_id: string | null;
  transfer_transaction_id: string | null; // NEW: Link to other side of transfer
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

export interface CreateTransferData {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_date: Date | string;
  notes?: string | null;
}

interface TransactionCreateResult extends Transaction {
  extra_money_detected: boolean;
  extra_money_entry?: ExtraMoneyEntry | null;
}

interface CreateTransactionData {
  account_id: string;
  category_id?: string | null;
  tag_id?: string | null;
  debt_id?: string | null;  // NEW: Optional debt link
  payee: string;
  amount: number;
  transaction_date: Date | string;
  notes?: string | null;
  is_cleared?: boolean;
  is_reconciled?: boolean;
}

interface UpdateTransactionData {
  category_id?: string | null;
  tag_id?: string | null;
  payee?: string;
  amount?: number;
  transaction_date?: Date | string;
  notes?: string | null;
  is_cleared?: boolean;
  is_reconciled?: boolean;
}

export class TransactionService {
  /**
   * Get all transactions for a household with optional filters
   */
  static async getAllTransactions(
    householdId: string,
    filters?: {
      account_id?: string;
      category_id?: string;
      start_date?: Date;
      end_date?: Date;
      limit?: number;
      offset?: number;
      include_split_children?: boolean;
      min_amount?: number;
      max_amount?: number;
      search?: string;
      type?: 'income' | 'expense' | 'transfer';
    }
  ): Promise<Transaction[]> {
    let query = knex('transactions')
      .leftJoin('transaction_tags as tt', 'transactions.id', 'tt.transaction_id')
      .where({ 'transactions.household_id': householdId })
      .select('transactions.*', 'tt.tag_id as tag_id')
      .orderBy('transaction_date', 'desc');

    // By default, exclude split children from the list (only show parent transactions)
    if (!filters?.include_split_children) {
      query = query.where({ 'transactions.is_split_child': false });
    }

    // Apply filters
    if (filters?.account_id) {
      query = query.where({ 'transactions.account_id': filters.account_id });
    }

    if (filters?.category_id) {
      query = query.where({ 'transactions.category_id': filters.category_id });
    }

    if (filters?.start_date) {
      query = query.where('transaction_date', '>=', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.where('transaction_date', '<=', filters.end_date);
    }

    if (filters?.min_amount !== undefined) {
      // Handle absolute comparison for amounts if user wants 'transactions > $50' 
      // regardless of inflow/outflow, filtering by magnitude usually makes more sense for "Amount" filters
      // But typically "Min Amount" in banking means strictly mathematical implication.
      // Let's assume standard range: amount >= min
      query = query.where('amount', '>=', filters.min_amount);
    }

    if (filters?.max_amount !== undefined) {
      query = query.where('amount', '<=', filters.max_amount);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where((builder) => {
        builder.where('payee', 'ilike', searchTerm)
          .orWhere('notes', 'ilike', searchTerm);
      });
    }

    if (filters?.type) {
      if (filters.type === 'income') {
        query = query.where('amount', '>', 0).whereNull('transfer_transaction_id');
      } else if (filters.type === 'expense') {
        query = query.where('amount', '<', 0).whereNull('transfer_transaction_id');
      } else if (filters.type === 'transfer') {
        query = query.whereNotNull('transfer_transaction_id');
      }
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.limit(limit).offset(offset);

    const transactions = await query;
    return transactions;
  }

  /**
   * Get a single transaction by ID
   */
  static async getTransactionById(transactionId: string, householdId: string): Promise<Transaction> {
    const transaction = await knex('transactions')
      .leftJoin('transaction_tags as tt', 'transactions.id', 'tt.transaction_id')
      .where({ 'transactions.id': transactionId, 'transactions.household_id': householdId })
      .select('transactions.*', 'tt.tag_id as tag_id')
      .first();

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    return transaction;
  }

  /**
   * Create a new transaction and update account balance
   * If linked to a debt, also creates a debt_payment record
   * Automatically detects extra money for positive transactions
   */
  static async createTransaction(
    householdId: string,
    userId: string,
    data: CreateTransactionData,
    trx?: Knex | Knex.Transaction
  ): Promise<TransactionCreateResult> {
    const { account_id, category_id, tag_id, debt_id, payee, amount, transaction_date, notes, is_cleared = false, is_reconciled = false } = data;
    const normalizedDate = typeof transaction_date === 'string'
      ? transaction_date
      : transaction_date.toISOString().split('T')[0];

    const createInTransaction = async (t: Knex | Knex.Transaction): Promise<TransactionCreateResult> => {
      // Verify account belongs to household
      await AccountService.getAccountById(account_id, householdId, t);

      // If category provided, verify it belongs to household
      if (category_id) {
        const category = await t('categories')
          .where({ id: category_id, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError('Category not found or does not belong to this household');
        }
      }

      // If tag provided, verify it belongs to household
      if (tag_id) {
        const tag = await t('tags')
          .where({ id: tag_id, household_id: householdId })
          .first();

        if (!tag) {
          throw new BadRequestError('Tag not found or does not belong to this household');
        }
      }

      // If debt provided, verify it belongs to household
      if (debt_id) {
        const debt = await t('debts')
          .where({ id: debt_id, household_id: householdId })
          .first();

        if (!debt) {
          throw new BadRequestError('Debt not found or does not belong to this household');
        }
      }

      // Create transaction
      const [transaction] = await t('transactions')
        .insert({
          household_id: householdId,
          account_id,
          category_id: category_id || null,
          debt_id: debt_id || null,  // NEW: Link to debt
          payee,
          amount,
          transaction_date,
          notes: notes || null,
          is_cleared,
          is_reconciled,
          created_by_user_id: userId,
          parent_transaction_id: null,
          is_split_child: false,
        })
        .returning('*');

      if (tag_id) {
        await t('transaction_tags').insert({
          transaction_id: transaction.id,
          tag_id
        });
        transaction.tag_id = tag_id;
      } else {
        transaction.tag_id = null;
      }

      await AnalyticsService.recordEvent(
        'transaction_created',
        householdId,
        userId,
        {
          amount,
          is_income: amount > 0,
          has_category: !!category_id,
          has_debt: !!debt_id,
        },
        t
      );

      // If transaction is linked to a debt and is an expense, create debt_payment record
      if (debt_id && amount < 0) {
        const paymentAmount = Math.abs(amount);  // Ensure positive for payment record

        await t('debt_payments').insert({
          id: uuidv4(),
          debt_id: debt_id,
          user_id: userId,
          amount: paymentAmount,
          payment_date: normalizedDate,
          notes: notes || null,
          transaction_id: transaction.id,
        });

        // Update debt balance
        await t('debts')
          .where({ id: debt_id })
          .decrement('current_balance', paymentAmount)
          .update({
            updated_at: t.fn.now()
          });

        // Check if debt is now paid off
        const updatedDebt = await t('debts')
          .where({ id: debt_id })
          .first();

        if (updatedDebt && updatedDebt.current_balance <= 0) {
          await t('debts')
            .where({ id: debt_id })
            .update({
              is_paid_off: true,
              paid_off_at: t.fn.now(),
              current_balance: 0  // Ensure balance doesn't go negative
            });
        }

        logger.info(`Debt payment transaction created: ${transaction.id}, debt_payment created for debt: ${debt_id}`);
      }

      // Recalculate account balance
      await AccountService.recalculateBalance(account_id, householdId, t);

      // AUTO-DETECT EXTRA MONEY (if positive income transaction)
      let extraMoneyDetected = false;
      let extraMoneyEntry: ExtraMoneyEntry | null = null;

      if (amount > 0) {
        const { shouldFlag, reason } = await ExtraMoneyService.detectExtraMoney(
          householdId,
          transaction.id,
          t
        );

        if (shouldFlag) {
          extraMoneyEntry = await ExtraMoneyService.createExtraMoneyEntry({
            household_id: householdId,
            transaction_id: transaction.id,
            source: payee || 'Unknown Source',
            amount: amount,
            received_date: normalizedDate,
            notes: notes || null,
            auto_detected: true,
            detection_reason: reason,
            user_id: userId
          }, t);

          extraMoneyDetected = true;
          logger.info(`Extra money detected for transaction: ${transaction.id}, entry: ${extraMoneyEntry.id}`);
        }
      }

      logger.info(`Transaction created: ${transaction.id} for account: ${account_id}`);

      // Return transaction with extra money flag
      return {
        ...transaction,
        extra_money_detected: extraMoneyDetected,
        extra_money_entry: extraMoneyEntry
      };
    };

    if (trx) {
      return await createInTransaction(trx);
    }

    // Use a transaction to ensure atomicity when creating debt payments
    return await knex.transaction(async (t) => createInTransaction(t));
  }

  /**
   * Create a transfer between two accounts
   * Creates two linked transactions: Outflow from source, Inflow to destination
   */
  static async createTransfer(
    householdId: string,
    userId: string,
    data: CreateTransferData
  ): Promise<{ outflow: Transaction; inflow: Transaction }> {
    const { from_account_id, to_account_id, amount, transaction_date, notes } = data;

    if (from_account_id === to_account_id) {
      throw new BadRequestError('Cannot transfer to the same account');
    }

    if (amount <= 0) {
      throw new BadRequestError('Transfer amount must be positive');
    }

    const normalizedDate = typeof transaction_date === 'string'
      ? transaction_date
      : transaction_date.toISOString().split('T')[0];

    return await knex.transaction(async (trx) => {
      // Verify both accounts belong to household
      await AccountService.getAccountById(from_account_id, householdId, trx);
      await AccountService.getAccountById(to_account_id, householdId, trx);

      const outflowId = uuidv4();
      const inflowId = uuidv4();

      // 1. Create Outflow (From Account) - INITIALLY NULL LINK
      // We must leave transfer_transaction_id null initially to avoid FK constraint error
      // because the inflow record doesn't exist yet.
      const [outflow] = await trx('transactions')
        .insert({
          id: outflowId,
          household_id: householdId,
          account_id: from_account_id,
          category_id: null, // Transfers have no category
          payee: 'Transfer to Account', // TODO: Could be dynamic name of other account
          amount: -amount, // Negative
          transaction_date: normalizedDate,
          notes: notes,
          created_by_user_id: userId,
          transfer_transaction_id: null, // Set to null first
          is_cleared: false,
          is_reconciled: false
        })
        .returning('*');

      // 2. Create Inflow (To Account) - LINK TO OUTFLOW
      const [inflow] = await trx('transactions')
        .insert({
          id: inflowId,
          household_id: householdId,
          account_id: to_account_id,
          category_id: null, // Transfers have no category
          payee: 'Transfer from Account',
          amount: amount, // Positive
          transaction_date: normalizedDate,
          notes: notes,
          created_by_user_id: userId,
          transfer_transaction_id: outflowId, // Link to existing outflow
          is_cleared: false,
          is_reconciled: false
        })
        .returning('*');

      // 3. Update Outflow to link to Inflow
      await trx('transactions')
        .where({ id: outflowId })
        .update({ transfer_transaction_id: inflowId });

      // Update the returned object so the UI sees the link
      outflow.transfer_transaction_id = inflowId;

      // 4. Update balances
      await AccountService.recalculateBalance(from_account_id, householdId, trx);
      await AccountService.recalculateBalance(to_account_id, householdId, trx);

      logger.info(`Transfer created: ${amount} from ${from_account_id} to ${to_account_id}`);

      return { outflow, inflow };
    });
  }

  /**
   * Update a transaction and recalculate account balance
   */
  static async updateTransaction(
    transactionId: string,
    householdId: string,
    data: UpdateTransactionData
  ): Promise<Transaction> {
    const { tag_id, ...transactionData } = data;

    // Check if transaction exists and belongs to household
    const existingTransaction = await this.getTransactionById(transactionId, householdId);

    // Check if transaction is split (has children)
    const splitChildren = await knex('transactions')
      .where({ parent_transaction_id: transactionId })
      .count('* as count')
      .first();

    const isSplit = splitChildren && parseInt(splitChildren.count as string) > 0;

    // Prevent amount updates on split transactions
    if (isSplit && data.amount !== undefined) {
      throw new BadRequestError(
        'Cannot change amount on a split transaction. Please unsplit the transaction first, then edit the amount.'
      );
    }

    // Prevent split children from being edited directly
    if (existingTransaction.is_split_child) {
      throw new BadRequestError(
        'Cannot edit a split child transaction directly. Please update the parent transaction splits instead.'
      );
    }

    // If category is being updated, verify it belongs to household
    if (transactionData.category_id !== undefined && transactionData.category_id !== null) {
      const category = await knex('categories')
        .where({ id: transactionData.category_id, household_id: householdId })
        .first();

      if (!category) {
        throw new BadRequestError('Category not found or does not belong to this household');
      }
    }

    if (tag_id !== undefined && tag_id !== null) {
      const tag = await knex('tags')
        .where({ id: tag_id, household_id: householdId })
        .first();

      if (!tag) {
        throw new BadRequestError('Tag not found or does not belong to this household');
      }
    }

    // Update transaction
    const [updatedTransaction] = await knex('transactions')
      .where({ id: transactionId, household_id: householdId })
      .update({
        ...transactionData,
        updated_at: knex.fn.now()
      })
      .returning('*');

    if (tag_id !== undefined) {
      if (tag_id === null) {
        await knex('transaction_tags')
          .where({ transaction_id: transactionId })
          .del();
        updatedTransaction.tag_id = null;
      } else {
        await knex('transaction_tags')
          .insert({
            transaction_id: transactionId,
            tag_id
          })
          .onConflict('transaction_id')
          .merge({ tag_id, updated_at: knex.fn.now() });
        updatedTransaction.tag_id = tag_id;
      }
    } else {
      const existingTag = await knex('transaction_tags')
        .where({ transaction_id: transactionId })
        .first();
      updatedTransaction.tag_id = existingTag?.tag_id || null;
    }

    // Recalculate account balance (amount or account may have changed)
    await AccountService.recalculateBalance(existingTransaction.account_id, householdId);

    logger.info(`Transaction updated: ${transactionId}`);

    return updatedTransaction;
  }

  /**
   * Delete a transaction and recalculate account balance
   * Handles transfers safely by deleting both sides
   */
  static async deleteTransaction(transactionId: string, householdId: string): Promise<void> {
    // Check if transaction exists and belongs to household
    const transaction = await this.getTransactionById(transactionId, householdId);

    // If it's part of a transfer, delegate to deleteTransfer
    if (transaction.transfer_transaction_id) {
      return this.deleteTransfer(transactionId, householdId);
    }

    // Delete transaction
    await knex('transactions')
      .where({ id: transactionId, household_id: householdId })
      .del();

    // Recalculate account balance
    await AccountService.recalculateBalance(transaction.account_id, householdId);

    logger.info(`Transaction deleted: ${transactionId}`);
  }

  /**
   * Delete a transfer (deletes both sides)
   */
  static async deleteTransfer(transactionId: string, householdId: string): Promise<void> {
    const transaction = await this.getTransactionById(transactionId, householdId);

    if (!transaction.transfer_transaction_id) {
      // Just a normal delete if not a transfer (or one side already gone)
      return this.deleteTransaction(transactionId, householdId);
    }

    const otherSideId = transaction.transfer_transaction_id;

    await knex.transaction(async (trx) => {
      // Delete primary
      await trx('transactions').where({ id: transactionId, household_id: householdId }).del();
      // Delete linked
      await trx('transactions').where({ id: otherSideId, household_id: householdId }).del();

      // Recalc balances
      await AccountService.recalculateBalance(transaction.account_id, householdId, trx);

      // We need to fetch the other transaction to know which account to update, but we might have deleted it.
      // Ideally we fetched it before. But recalculateBalance for just the one we know is safe-ish. 
      // Actually, we should get the other account ID first.
    });

    // Simplification: Just call deleteTransaction for both. 
    // But since they reference each other, we might need to be careful with FKs if we enforced them strictly.
    // Our migration said "ON DELETE SET NULL", so deleting one should just nullify the other's link.
    // So we can just delete the one we targeted, and then optionally delete the other if we want to enforce atomic deletion.

    // Better approach:
    // 1. Get both transaction records to know accounts.
    // 2. Delete both.
    // 3. Recalc both accounts.

    const otherTransaction = await knex('transactions').where({ id: otherSideId, household_id: householdId }).first();

    await knex.transaction(async (trx) => {
      await trx('transactions').where({ id: transactionId }).del();
      if (otherTransaction) {
        await trx('transactions').where({ id: otherSideId }).del();
      }
    });

    await AccountService.recalculateBalance(transaction.account_id, householdId);
    if (otherTransaction) {
      await AccountService.recalculateBalance(otherTransaction.account_id, householdId);
    }
  }

  /**
   * Mark transaction as cleared
   */
  static async clearTransaction(transactionId: string, householdId: string): Promise<Transaction> {
    return this.updateTransaction(transactionId, householdId, { is_cleared: true });
  }

  /**
   * Mark transaction as reconciled (implies cleared)
   */
  static async reconcileTransaction(transactionId: string, householdId: string): Promise<Transaction> {
    return this.updateTransaction(transactionId, householdId, {
      is_cleared: true,
      is_reconciled: true
    });
  }

  /**
   * Get transactions for a specific account
   */
  static async getAccountTransactions(
    accountId: string,
    householdId: string,
    limit = 50,
    offset = 0
  ): Promise<Transaction[]> {
    // Verify account belongs to household
    await AccountService.getAccountById(accountId, householdId);

    return this.getAllTransactions(householdId, {
      account_id: accountId,
      limit,
      offset
    });
  }

  /**
   * Get transactions for a specific category
   */
  static async getCategoryTransactions(
    categoryId: string,
    householdId: string,
    limit = 50,
    offset = 0
  ): Promise<Transaction[]> {
    return this.getAllTransactions(householdId, {
      category_id: categoryId,
      limit,
      offset
    });
  }

  /**
   * Get all income transactions for a household in a given month
   * Income transactions are identified by positive amount values
   */
  static async getIncomeTransactions(
    householdId: string,
    month: string
  ): Promise<Transaction[]> {
    const monthStart = `${month}-01`;
    const lastDay = new Date(
      parseInt(month.split('-')[0]),
      parseInt(month.split('-')[1]),
      0
    ).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

    const transactions = await knex('transactions')
      .leftJoin('transaction_tags as tt', 'transactions.id', 'tt.transaction_id')
      .where({ 'transactions.household_id': householdId })
      .whereBetween('transaction_date', [monthStart, monthEnd])
      .where('amount', '>', 0) // Income only (positive amounts)
      .orderBy('transaction_date', 'desc')
      .select('transactions.*', 'tt.tag_id as tag_id');

    return transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));
  }
}
