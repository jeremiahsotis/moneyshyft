import knex from '../config/knex';
import type { Knex } from 'knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { TransactionService } from './TransactionService';
import logger from '../utils/logger';

type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
type InstanceStatus = 'pending' | 'approved' | 'posted' | 'skipped';

interface RecurringTransaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  payee: string;
  amount: number;
  notes: string | null;
  frequency: FrequencyType;
  start_date: Date;
  end_date: Date | null;
  next_occurrence: Date;
  auto_post: boolean;
  skip_weekends: boolean;
  advance_notice_days: number;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RecurringTransactionInstance {
  id: string;
  household_id: string;
  recurring_transaction_id: string;
  account_id: string;
  category_id: string | null;
  payee: string;
  amount: number;
  notes: string | null;
  due_date: Date;
  status: InstanceStatus;
  transaction_id: string | null;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  posted_at: Date | null;
  skipped_by_user_id: string | null;
  skipped_at: Date | null;
  skip_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateRecurringData {
  account_id: string;
  category_id?: string | null;
  payee: string;
  amount: number;
  notes?: string | null;
  frequency: FrequencyType;
  start_date: string; // ISO date string
  end_date?: string | null;
  auto_post?: boolean;
  skip_weekends?: boolean;
  advance_notice_days?: number;
}

export class RecurringTransactionService {
  /**
   * Calculate the next occurrence date based on current date and frequency
   */
  static calculateNextOccurrence(
    currentDate: Date,
    frequency: FrequencyType,
    skipWeekends: boolean = false
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    // Skip weekends if enabled (move to Monday)
    if (skipWeekends) {
      const dayOfWeek = next.getDay();
      if (dayOfWeek === 0) { // Sunday
        next.setDate(next.getDate() + 1);
      } else if (dayOfWeek === 6) { // Saturday
        next.setDate(next.getDate() + 2);
      }
    }

    return next;
  }

  /**
   * Check if we should generate an instance (within advance notice window)
   */
  static shouldGenerateInstance(
    occurrenceDate: Date,
    advanceNoticeDays: number,
    today: Date = new Date()
  ): boolean {
    const noticeDate = new Date(occurrenceDate);
    noticeDate.setDate(noticeDate.getDate() - advanceNoticeDays);

    // Generate if today is >= notice date
    return today >= noticeDate;
  }

  /**
   * Create a new recurring transaction template
   */
  static async createRecurring(
    householdId: string,
    userId: string,
    data: CreateRecurringData
  ): Promise<RecurringTransaction> {
    return await knex.transaction(async (trx) => {
      // Verify account belongs to household
      const account = await trx('accounts')
        .where({ id: data.account_id, household_id: householdId })
        .first();

      if (!account) {
        throw new BadRequestError('Account not found or does not belong to this household');
      }

      // Verify category if provided
      if (data.category_id) {
        const category = await trx('categories')
          .where({ id: data.category_id, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError('Category not found or does not belong to this household');
        }
      }

      const startDate = new Date(data.start_date);
      const nextOccurrence = this.calculateNextOccurrence(
        startDate,
        data.frequency,
        data.skip_weekends || false
      );

      // Create recurring transaction template
      const [recurring] = await trx('recurring_transactions')
        .insert({
          household_id: householdId,
          account_id: data.account_id,
          category_id: data.category_id || null,
          payee: data.payee,
          amount: data.amount,
          notes: data.notes || null,
          frequency: data.frequency,
          start_date: startDate,
          end_date: data.end_date ? new Date(data.end_date) : null,
          next_occurrence: nextOccurrence,
          auto_post: data.auto_post || false,
          skip_weekends: data.skip_weekends || false,
          advance_notice_days: data.advance_notice_days || 3,
          is_active: true,
          created_by_user_id: userId
        })
        .returning('*');

      logger.info(`Created recurring transaction template ${recurring.id} for household ${householdId}`);

      // Generate first instance if within notice window
      await this.generateInstancesForRecurring(recurring.id, householdId, 30, trx);

      return recurring;
    });
  }

  /**
   * Get all recurring transaction templates for a household
   */
  static async getAllRecurring(householdId: string): Promise<RecurringTransaction[]> {
    return await knex('recurring_transactions as rt')
      .leftJoin('categories as c', 'rt.category_id', 'c.id')
      .select(
        'rt.*',
        'c.name as category_name'
      )
      .where({ 'rt.household_id': householdId })
      .orderBy('rt.created_at', 'desc');
  }

  /**
   * Get a single recurring transaction template
   */
  static async getRecurring(
    recurringId: string,
    householdId: string
  ): Promise<RecurringTransaction> {
    const recurring = await knex('recurring_transactions')
      .where({ id: recurringId, household_id: householdId })
      .first();

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    return recurring;
  }

  /**
   * Update a recurring transaction template
   */
  static async updateRecurring(
    recurringId: string,
    householdId: string,
    data: Partial<CreateRecurringData>
  ): Promise<RecurringTransaction> {
    return await knex.transaction(async (trx) => {
      const existing = await trx('recurring_transactions')
        .where({ id: recurringId, household_id: householdId })
        .first();

      if (!existing) {
        throw new NotFoundError('Recurring transaction not found');
      }

      // Verify account if being updated
      if (data.account_id) {
        const account = await trx('accounts')
          .where({ id: data.account_id, household_id: householdId })
          .first();

        if (!account) {
          throw new BadRequestError('Account not found or does not belong to this household');
        }
      }

      // Verify category if being updated
      if (data.category_id) {
        const category = await trx('categories')
          .where({ id: data.category_id, household_id: householdId })
          .first();

        if (!category) {
          throw new BadRequestError('Category not found or does not belong to this household');
        }
      }

      const updateData: any = {
        updated_at: trx.fn.now()
      };

      if (data.account_id !== undefined) updateData.account_id = data.account_id;
      if (data.category_id !== undefined) updateData.category_id = data.category_id;
      if (data.payee !== undefined) updateData.payee = data.payee;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.frequency !== undefined) updateData.frequency = data.frequency;
      if (data.auto_post !== undefined) updateData.auto_post = data.auto_post;
      if (data.skip_weekends !== undefined) updateData.skip_weekends = data.skip_weekends;
      if (data.advance_notice_days !== undefined) updateData.advance_notice_days = data.advance_notice_days;

      const [updated] = await trx('recurring_transactions')
        .where({ id: recurringId })
        .update(updateData)
        .returning('*');

      logger.info(`Updated recurring transaction ${recurringId}`);

      return updated;
    });
  }

  /**
   * Deactivate a recurring transaction (soft delete)
   */
  static async deactivateRecurring(
    recurringId: string,
    householdId: string
  ): Promise<void> {
    const result = await knex('recurring_transactions')
      .where({ id: recurringId, household_id: householdId })
      .update({
        is_active: false,
        updated_at: knex.fn.now()
      });

    if (result === 0) {
      throw new NotFoundError('Recurring transaction not found');
    }

    logger.info(`Deactivated recurring transaction ${recurringId}`);
  }

  /**
   * Generate instances for a specific recurring transaction
   */
  static async generateInstancesForRecurring(
    recurringId: string,
    householdId: string,
    daysAhead: number = 30,
    trx?: any
  ): Promise<number> {
    const db = trx || knex;

    const recurring = await db('recurring_transactions')
      .where({ id: recurringId, household_id: householdId, is_active: true })
      .first();

    if (!recurring) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    let currentOccurrence = new Date(recurring.next_occurrence);
    let instancesCreated = 0;

    while (currentOccurrence <= endDate) {
      // Check if past end date
      if (recurring.end_date && currentOccurrence > new Date(recurring.end_date)) {
        break;
      }

      // Check if instance already exists
      const existing = await db('recurring_transaction_instances')
        .where({
          recurring_transaction_id: recurringId,
          due_date: currentOccurrence
        })
        .first();

      if (!existing && this.shouldGenerateInstance(currentOccurrence, recurring.advance_notice_days, today)) {
        await db('recurring_transaction_instances').insert({
          household_id: householdId,
          recurring_transaction_id: recurringId,
          account_id: recurring.account_id,
          category_id: recurring.category_id,
          payee: recurring.payee,
          amount: recurring.amount,
          notes: recurring.notes,
          due_date: currentOccurrence,
          status: 'pending'
        });

        instancesCreated++;
      }

      // Calculate next occurrence
      currentOccurrence = this.calculateNextOccurrence(
        currentOccurrence,
        recurring.frequency,
        recurring.skip_weekends
      );
    }

    // Update next_occurrence on template
    if (instancesCreated > 0) {
      await db('recurring_transactions')
        .where({ id: recurringId })
        .update({ next_occurrence: currentOccurrence });
    }

    return instancesCreated;
  }

  /**
   * Generate instances for all active recurring transactions
   */
  static async generateAllUpcomingInstances(
    householdId?: string,
    daysAhead: number = 30
  ): Promise<number> {
    const query = knex('recurring_transactions').where({ is_active: true });

    if (householdId) {
      query.where({ household_id: householdId });
    }

    const allRecurring = await query;
    let totalCreated = 0;

    for (const recurring of allRecurring) {
      const created = await this.generateInstancesForRecurring(
        recurring.id,
        recurring.household_id,
        daysAhead
      );
      totalCreated += created;
    }

    logger.info(`Generated ${totalCreated} recurring transaction instances`);
    return totalCreated;
  }

  /**
   * Get pending instances for a household
   */
  static async getPendingInstances(
    householdId: string,
    daysAhead: number = 7
  ): Promise<RecurringTransactionInstance[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return await knex('recurring_transaction_instances as rti')
      .leftJoin('categories as c', 'rti.category_id', 'c.id')
      .select(
        'rti.*',
        'c.name as category_name'
      )
      .where({ 'rti.household_id': householdId, 'rti.status': 'pending' })
      .where('rti.due_date', '<=', endDate)
      .orderBy('rti.due_date', 'asc');
  }

  /**
   * Get all instances (any status) for a household
   */
  static async getAllInstances(
    householdId: string,
    status?: InstanceStatus
  ): Promise<RecurringTransactionInstance[]> {
    const query = knex('recurring_transaction_instances as rti')
      .leftJoin('categories as c', 'rti.category_id', 'c.id')
      .select(
        'rti.*',
        'c.name as category_name'
      )
      .where({ 'rti.household_id': householdId });

    if (status) {
      query.where({ 'rti.status': status });
    }

    return await query.orderBy('rti.due_date', 'desc');
  }

  /**
   * Approve an instance
   */
  static async approveInstance(
    instanceId: string,
    householdId: string,
    userId: string
  ): Promise<RecurringTransactionInstance> {
    return await knex.transaction(async (trx) => {
      const instance = await trx('recurring_transaction_instances')
        .where({ id: instanceId, household_id: householdId })
        .first();

      if (!instance) {
        throw new NotFoundError('Recurring transaction instance not found');
      }

      if (instance.status !== 'pending') {
        throw new BadRequestError(`Instance is already ${instance.status}`);
      }

      const [updated] = await trx('recurring_transaction_instances')
        .where({ id: instanceId })
        .update({
          status: 'approved',
          approved_by_user_id: userId,
          approved_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');

      logger.info(`Approved recurring instance ${instanceId}`);

      // Check if we should auto-post
      const recurring = await trx('recurring_transactions')
        .where({ id: instance.recurring_transaction_id })
        .first();

      if (recurring && recurring.auto_post) {
        return await this.postInstance(instanceId, householdId, userId, trx);
      }

      return updated;
    });
  }

  /**
   * Skip an instance
   */
  static async skipInstance(
    instanceId: string,
    householdId: string,
    userId: string,
    reason?: string
  ): Promise<RecurringTransactionInstance> {
    const instance = await knex('recurring_transaction_instances')
      .where({ id: instanceId, household_id: householdId })
      .first();

    if (!instance) {
      throw new NotFoundError('Recurring transaction instance not found');
    }

    if (instance.status === 'posted') {
      throw new BadRequestError('Cannot skip an instance that has already been posted');
    }

    const [updated] = await knex('recurring_transaction_instances')
      .where({ id: instanceId })
      .update({
        status: 'skipped',
        skipped_by_user_id: userId,
        skipped_at: knex.fn.now(),
        skip_reason: reason || null,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Skipped recurring instance ${instanceId}`);

    return updated;
  }

  /**
   * Post an approved instance as an actual transaction
   */
  static async postInstance(
    instanceId: string,
    householdId: string,
    userId: string,
    trx?: Knex | Knex.Transaction
  ): Promise<RecurringTransactionInstance> {
    const postWithTransaction = async (t: Knex | Knex.Transaction): Promise<RecurringTransactionInstance> => {
      const instance = await t('recurring_transaction_instances')
        .where({ id: instanceId, household_id: householdId })
        .first();

      if (!instance) {
        throw new NotFoundError('Recurring transaction instance not found');
      }

      if (instance.status === 'posted') {
        throw new BadRequestError('Instance has already been posted');
      }

      if (instance.status === 'skipped') {
        throw new BadRequestError('Cannot post a skipped instance');
      }

      // Create the actual transaction
      const transaction = await TransactionService.createTransaction(householdId, userId, {
        account_id: instance.account_id,
        category_id: instance.category_id,
        payee: instance.payee,
        amount: instance.amount,
        transaction_date: new Date(instance.due_date).toISOString().split('T')[0],
        notes: instance.notes || undefined,
        is_cleared: false
      }, t);

      // Update instance
      const [updated] = await t('recurring_transaction_instances')
        .where({ id: instanceId })
        .update({
          status: 'posted',
          transaction_id: transaction.id,
          posted_at: t.fn.now(),
          updated_at: t.fn.now(),
          // Also record approval if not already approved
          approved_by_user_id: instance.approved_by_user_id || userId,
          approved_at: instance.approved_at || t.fn.now()
        })
        .returning('*');

      logger.info(`Posted recurring instance ${instanceId} as transaction ${transaction.id}`);

      return updated;
    };

    if (trx) {
      return await postWithTransaction(trx);
    }

    return await knex.transaction(async (t) => postWithTransaction(t));
  }

  /**
   * Update an instance before posting (edit amount, category, etc.)
   */
  static async updateInstance(
    instanceId: string,
    householdId: string,
    data: {
      amount?: number;
      category_id?: string | null;
      payee?: string;
      notes?: string | null;
    }
  ): Promise<RecurringTransactionInstance> {
    const instance = await knex('recurring_transaction_instances')
      .where({ id: instanceId, household_id: householdId })
      .first();

    if (!instance) {
      throw new NotFoundError('Recurring transaction instance not found');
    }

    if (instance.status === 'posted') {
      throw new BadRequestError('Cannot edit an instance that has already been posted');
    }

    const updateData: any = { updated_at: knex.fn.now() };

    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.payee !== undefined) updateData.payee = data.payee;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await knex('recurring_transaction_instances')
      .where({ id: instanceId })
      .update(updateData)
      .returning('*');

    logger.info(`Updated recurring instance ${instanceId}`);

    return updated;
  }

  /**
   * Auto-post all approved instances that are due today
   */
  static async autoPostDueInstances(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueInstances = await knex('recurring_transaction_instances')
      .where({ status: 'approved' })
      .where('due_date', '<=', today)
      .whereNotNull('approved_at');

    let posted = 0;

    for (const instance of dueInstances) {
      try {
        // Get recurring template to check auto_post setting
        const recurring = await knex('recurring_transactions')
          .where({ id: instance.recurring_transaction_id })
          .first();

        if (recurring && recurring.auto_post) {
          await this.postInstance(
            instance.id,
            instance.household_id,
            instance.approved_by_user_id || recurring.created_by_user_id
          );
          posted++;
        }
      } catch (error) {
        logger.error(`Failed to auto-post instance ${instance.id}: ${error}`);
      }
    }

    logger.info(`Auto-posted ${posted} recurring transaction instances`);
    return posted;
  }

  /**
   * Toggle auto-post setting for a recurring transaction
   */
  static async toggleAutoPost(
    recurringId: string,
    householdId: string
  ): Promise<RecurringTransaction> {
    const recurring = await knex('recurring_transactions')
      .where({ id: recurringId, household_id: householdId })
      .first();

    if (!recurring) {
      throw new NotFoundError('Recurring transaction not found');
    }

    const [updated] = await knex('recurring_transactions')
      .where({ id: recurringId })
      .update({
        auto_post: !recurring.auto_post,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Toggled auto_post for recurring ${recurringId} to ${updated.auto_post}`);

    return updated;
  }
}
