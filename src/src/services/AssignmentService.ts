import knex from '../config/knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { BudgetService } from './BudgetService';
import { v4 as uuidv4 } from 'uuid';

export interface IncomeAssignment {
  id: string;
  household_id: string;
  income_transaction_id: string;
  month: string;
  category_id: string | null;
  section_id: string | null;
  amount: number;
  notes: string | null;
  created_at: Date;
  created_by_user_id: string | null;
}

export interface CreateAssignmentData {
  income_transaction_id: string;
  category_id?: string;
  section_id?: string;
  amount: number;
  notes?: string;
}

export interface AutoAssignmentResult {
  assignments: IncomeAssignment[];
  total_assigned: number;
  remaining: number;
}

export interface CategoryAssignmentRequest {
  category_id?: string;
  section_id?: string;
  amount: number;
}

export interface TransactionWithAvailable {
  id: string;
  household_id: string;
  amount: number;
  transaction_date: string;
  available: number; // amount - already assigned
}

export class AssignmentService {
  /**
   * Get all assignments for a household in a given month
   */
  static async getAssignments(
    householdId: string,
    month: string
  ): Promise<IncomeAssignment[]> {
    const assignments = await knex('income_assignments')
      .where({ household_id: householdId, month })
      .orderBy('created_at', 'asc')
      .select('*');

    return assignments.map((a) => ({
      ...a,
      amount: Number(a.amount),
    }));
  }

  /**
   * Create a manual assignment of income to a category/section
   */
  static async createAssignment(
    householdId: string,
    userId: string,
    data: CreateAssignmentData
  ): Promise<IncomeAssignment> {
    // Validate transaction belongs to household and is income
    const transaction = await knex('transactions')
      .where({ id: data.income_transaction_id, household_id: householdId })
      .first();

    if (!transaction) {
      throw new NotFoundError('Income transaction not found');
    }

    if (Number(transaction.amount) <= 0) {
      throw new BadRequestError('Transaction must be income (positive amount)');
    }

    // Extract month from transaction date
    const transactionDate = new Date(transaction.transaction_date);
    const month = transactionDate.toISOString().slice(0, 7);

    // Validate category/section belongs to household
    if (data.category_id) {
      const category = await knex('categories')
        .join('category_sections', 'categories.section_id', 'category_sections.id')
        .where({ 'categories.id': data.category_id, 'category_sections.household_id': householdId })
        .first();

      if (!category) {
        throw new NotFoundError('Category not found');
      }
    } else if (data.section_id) {
      const section = await knex('category_sections')
        .where({ id: data.section_id, household_id: householdId })
        .first();

      if (!section) {
        throw new NotFoundError('Section not found');
      }
    } else {
      throw new BadRequestError('Either category_id or section_id must be provided');
    }

    // Check: Don't assign more than transaction amount
    const existingAssignments = await this.getAssignmentsForTransaction(data.income_transaction_id);
    const totalAssigned = existingAssignments.reduce((sum, a) => sum + a.amount, 0);

    if (totalAssigned + data.amount > Number(transaction.amount)) {
      throw new BadRequestError(
        `Cannot assign $${data.amount}. Transaction amount: $${transaction.amount}, ` +
        `already assigned: $${totalAssigned}, available: $${Number(transaction.amount) - totalAssigned}`
      );
    }

    // Create assignment
    const [assignment] = await knex('income_assignments')
      .insert({
        household_id: householdId,
        income_transaction_id: data.income_transaction_id,
        month,
        category_id: data.category_id || null,
        section_id: data.section_id || null,
        amount: data.amount,
        notes: data.notes || null,
        created_by_user_id: userId,
      })
      .returning('*');

    // Update assigned_amount in budget_allocations
    await this.updateAssignedAmount(householdId, month, data.category_id, data.section_id);

    logger.info(`Income assignment created: ${assignment.id} - $${data.amount} assigned`);

    return {
      ...assignment,
      amount: Number(assignment.amount),
    };
  }

  /**
   * Get all assignments for a specific income transaction
   */
  static async getAssignmentsForTransaction(
    transactionId: string
  ): Promise<IncomeAssignment[]> {
    const assignments = await knex('income_assignments')
      .where({ income_transaction_id: transactionId })
      .select('*');

    return assignments.map((a) => ({
      ...a,
      amount: Number(a.amount),
    }));
  }

  /**
   * Update assigned_amount in budget_allocations based on assignments
   */
  private static async updateAssignedAmount(
    householdId: string,
    month: string,
    categoryId?: string,
    sectionId?: string
  ): Promise<void> {
    // Calculate total assigned to this category/section
    const query = knex('income_assignments')
      .where({ household_id: householdId, month })
      .sum('amount as total');

    if (categoryId) {
      query.where({ category_id: categoryId });
    } else {
      query.where({ section_id: sectionId });
    }

    const incomeAssignedResult = await query.first();
    const incomeAssigned = Number(incomeAssignedResult?.total || 0);

    const balanceAssignedResult = await knex('account_balance_assignments')
      .where({ household_id: householdId, month })
      .modify(qb => {
        if (categoryId) {
          qb.where({ category_id: categoryId });
        } else {
          qb.where({ section_id: sectionId });
        }
      })
      .sum('amount as total')
      .first();
    const balanceAssigned = Number(balanceAssignedResult?.total || 0);
    const totalAssigned = incomeAssigned + balanceAssigned;

    // Get or create budget allocation
    // Convert month string (YYYY-MM) to Date object
    const monthDate = new Date(`${month}-01`);
    const budgetMonth = await BudgetService.getOrCreateBudgetMonth(householdId, monthDate);

    // Find existing allocation
    const existingAllocation = await knex('budget_allocations')
      .where({
        budget_month_id: budgetMonth.id,
        ...(categoryId ? { category_id: categoryId } : { section_id: sectionId }),
      })
      .first();

    if (existingAllocation) {
      // Update assigned_amount
      await knex('budget_allocations')
        .where({ id: existingAllocation.id })
        .update({ assigned_amount: totalAssigned, updated_at: knex.fn.now() });
    } else {
      // Create allocation with assigned_amount (allocated_amount = 0 initially)
      await knex('budget_allocations')
        .insert({
          budget_month_id: budgetMonth.id,
          category_id: categoryId || null,
          section_id: sectionId || null,
          allocated_amount: 0, // No budget set yet
          assigned_amount: totalAssigned,
          rollup_mode: !!sectionId,
        });
    }
  }

  /**
   * Auto-assign income to underfunded categories
   * Prioritizes categories with budgets that have low assigned amounts
   */
  static async autoAssignIncome(
    householdId: string,
    incomeTransactionId: string,
    userId: string
  ): Promise<AutoAssignmentResult> {
    // Get income transaction
    const transaction = await knex('transactions')
      .where({ id: incomeTransactionId, household_id: householdId })
      .first();

    if (!transaction) {
      throw new NotFoundError('Income transaction not found');
    }

    const transactionDate = new Date(transaction.transaction_date);
    const month = transactionDate.toISOString().slice(0, 7);
    let remaining = Number(transaction.amount);

    // Check how much already assigned
    const existingAssignments = await this.getAssignmentsForTransaction(incomeTransactionId);
    const alreadyAssigned = existingAssignments.reduce((sum, a) => sum + a.amount, 0);
    remaining -= alreadyAssigned;

    if (remaining <= 0) {
      return {
        assignments: [],
        total_assigned: 0,
        remaining: 0,
      };
    }

    // Get budget allocations that need funding (allocated > assigned)
    // Convert month string (YYYY-MM) to Date object
    const monthDate = new Date(`${month}-01`);
    const budgetMonth = await BudgetService.getOrCreateBudgetMonth(householdId, monthDate);

    const allocations = await knex('budget_allocations')
      .where({ budget_month_id: budgetMonth.id })
      .whereRaw('allocated_amount > assigned_amount')
      .orderBy([
        { column: 'allocated_amount', order: 'desc' }, // Prioritize larger budgets
        { column: 'assigned_amount', order: 'asc' },   // Then least funded
      ])
      .select('*');

    const assignments: IncomeAssignment[] = [];
    let totalAssigned = 0;

    // Assign to each allocation until money runs out
    for (const allocation of allocations) {
      if (remaining <= 0) break;

      const needed = Number(allocation.allocated_amount) - Number(allocation.assigned_amount);
      const assignAmount = Math.min(needed, remaining);

      // Create assignment
      const assignment = await this.createAssignment(householdId, userId, {
        income_transaction_id: incomeTransactionId,
        category_id: allocation.category_id,
        section_id: allocation.section_id,
        amount: assignAmount,
        notes: 'Auto-assigned',
      });

      assignments.push(assignment);
      totalAssigned += assignAmount;
      remaining -= assignAmount;
    }

    return {
      assignments,
      total_assigned: totalAssigned,
      remaining,
    };
  }

  /**
   * Delete an assignment (unassign money)
   */
  static async deleteAssignment(
    assignmentId: string,
    householdId: string
  ): Promise<void> {
    const assignment = await knex('income_assignments')
      .where({ id: assignmentId, household_id: householdId })
      .first();

    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    await knex('income_assignments')
      .where({ id: assignmentId })
      .delete();

    // Update assigned_amount
    await this.updateAssignedAmount(
      householdId,
      assignment.month,
      assignment.category_id,
      assignment.section_id
    );

    logger.info(`Assignment deleted: ${assignmentId}`);
  }

  /**
   * Calculate "To Be Assigned" amount for a month
   * = Total income received - Total assigned
   */
  static async getToBeAssigned(
    householdId: string,
    month: string
  ): Promise<number> {
    // Use UTC to avoid timezone issues
    const [year, monthPart] = month.split('-');
    const monthNum = parseInt(monthPart) - 1; // Convert to 0-based
    const yearNum = parseInt(year);

    const startDate = new Date(Date.UTC(yearNum, monthNum, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999));

    const monthStart = startDate.toISOString().split('T')[0];
    const monthEnd = endDate.toISOString().split('T')[0];

    // Get all income transactions for the month
    const incomeResult = await knex('transactions')
      .where({ household_id: householdId })
      .whereBetween('transaction_date', [monthStart, monthEnd])
      .where('amount', '>', 0) // Income only
      .sum('amount as total')
      .first();

    const totalIncome = Number(incomeResult?.total || 0);

    // Get total account starting balances
    const accountBalancesResult = await knex('accounts')
      .where({ household_id: householdId, is_active: true })
      .sum('starting_balance as total')
      .first();

    const totalAccountBalances = Number(accountBalancesResult?.total || 0);

    // Get all income assignments for the month
    const assignedResult = await knex('income_assignments')
      .where({ household_id: householdId, month })
      .sum('amount as total')
      .first();
    const totalIncomeAssigned = Number(assignedResult?.total || 0);

    // Opening balance assignments are a one-time pool; subtract all-time to prevent reappearing each month
    const assignedBalancesResult = await knex('account_balance_assignments')
      .where({ household_id: householdId })
      .sum('amount as total')
      .first();
    const totalAssignedBalances = Number(assignedBalancesResult?.total || 0);

    // Get Savings Reserve assignments (they reduce available funds)
    const savingsReserveResult = await knex('extra_money_entries')
      .where({ household_id: householdId })
      .whereBetween('received_date', [monthStart, monthEnd])
      .sum('savings_reserve as total')
      .first();

    const totalSavingsReserve = Number(savingsReserveResult?.total || 0);

    // Total Available = (Real Income + Account Balances) - (Assigned + Savings Reserve)
    // Assigned comes from budget_allocations so it's consistent with BudgetService summary.
    return (totalIncome + totalAccountBalances) - (totalIncomeAssigned + totalAssignedBalances + totalSavingsReserve);
  }

  /**
   * Transfer money between categories
   * This allows users to reallocate assigned money
   */
  static async transferMoney(
    householdId: string,
    userId: string,
    data: {
      from_category_id?: string;
      from_section_id?: string;
      to_category_id?: string;
      to_section_id?: string;
      amount: number;
      month: string;
      notes?: string;
    }
  ): Promise<void> {
    const { from_category_id, from_section_id, to_category_id, to_section_id, amount, month, notes } = data;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Get budget month
    // Convert month string (YYYY-MM) to Date object
    const monthDate = new Date(`${month}-01`);
    const budgetMonth = await BudgetService.getOrCreateBudgetMonth(householdId, monthDate);

    // Find source allocation
    const sourceWhere: any = { budget_month_id: budgetMonth.id };
    if (from_category_id) {
      sourceWhere.category_id = from_category_id;
    } else if (from_section_id) {
      sourceWhere.section_id = from_section_id;
      sourceWhere.category_id = null; // Rollup mode
    } else {
      throw new Error('Source category or section required');
    }

    const sourceAllocation = await knex('budget_allocations')
      .where(sourceWhere)
      .first();

    if (!sourceAllocation) {
      throw new Error('Source allocation not found');
    }

    // Check if source has enough available money
    const sourceAvailable = Number(sourceAllocation.assigned_amount) - Number(sourceAllocation.spent_amount);
    if (sourceAvailable < amount) {
      throw new Error(`Insufficient available money in source. Available: ${sourceAvailable}, Requested: ${amount}`);
    }

    // Find or create destination allocation
    const destWhere: any = { budget_month_id: budgetMonth.id };
    if (to_category_id) {
      destWhere.category_id = to_category_id;
    } else if (to_section_id) {
      destWhere.section_id = to_section_id;
      destWhere.category_id = null; // Rollup mode
    } else {
      throw new Error('Destination category or section required');
    }

    let destAllocation = await knex('budget_allocations')
      .where(destWhere)
      .first();

    if (!destAllocation) {
      // Create allocation if doesn't exist
      const [newAllocation] = await knex('budget_allocations')
        .insert({
          budget_month_id: budgetMonth.id,
          category_id: to_category_id || null,
          section_id: to_section_id || null,
          allocated_amount: 0,
          assigned_amount: 0,
          spent_amount: 0,
        })
        .returning('*');
      destAllocation = newAllocation;
    }

    // Perform transfer in a transaction
    await knex.transaction(async (trx) => {
      // Decrease source assigned_amount
      await trx('budget_allocations')
        .where({ id: sourceAllocation.id })
        .update({
          assigned_amount: knex.raw('assigned_amount - ?', [amount]),
          updated_at: knex.fn.now(),
        });

      // Increase destination assigned_amount
      await trx('budget_allocations')
        .where({ id: destAllocation.id })
        .update({
          assigned_amount: knex.raw('assigned_amount + ?', [amount]),
          updated_at: knex.fn.now(),
        });

      // Log transfer for audit trail
      await trx('assignment_transfers').insert({
        household_id: householdId,
        from_category_id,
        from_section_id,
        to_category_id,
        to_section_id,
        amount,
        month,
        notes,
        created_by: userId,
      });
    });

    logger.info(`Money transferred: ${amount} from ${from_category_id || from_section_id} to ${to_category_id || to_section_id}`);
  }

  /**
   * Build pool of income transactions with available amounts (FIFO order)
   * @private
   */
  private static async buildTransactionPool(
    householdId: string,
    month: string,
    trx: any
  ): Promise<TransactionWithAvailable[]> {
    // Get month date range using UTC
    const [year, monthPart] = month.split('-');
    const monthNum = parseInt(monthPart) - 1;
    const yearNum = parseInt(year);

    const startDate = new Date(Date.UTC(yearNum, monthNum, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum + 1, 0, 23, 59, 59, 999));

    const monthStart = startDate.toISOString().split('T')[0];
    const monthEnd = endDate.toISOString().split('T')[0];

    // Get all income transactions for month (FIFO order)
    const transactions = await trx('transactions')
      .where({ household_id: householdId })
      .whereBetween('transaction_date', [monthStart, monthEnd])
      .where('amount', '>', 0) // Income only
      .orderBy('transaction_date', 'asc') // FIFO: oldest first
      .select('*');

    // Calculate available amount for each transaction
    const pool: TransactionWithAvailable[] = [];

    for (const transaction of transactions) {
      const existingAssignments = await trx('income_assignments')
        .where({ income_transaction_id: transaction.id })
        .sum('amount as total')
        .first();

      const assigned = Number(existingAssignments?.total || 0);
      const available = Number(transaction.amount) - assigned;

      if (available > 0) {
        pool.push({
          id: transaction.id,
          household_id: transaction.household_id,
          amount: Number(transaction.amount),
          transaction_date: transaction.transaction_date,
          available,
        });
      }
    }

    return pool;
  }

  /**
   * Assign to categories using FIFO transaction matching
   * Automatically distributes money across income transactions in date order
   */
  static async assignToCategories(
    householdId: string,
    userId: string,
    month: string,
    categoryAssignments: CategoryAssignmentRequest[]
  ): Promise<AutoAssignmentResult> {
    return await knex.transaction(async (trx) => {
      // 1. Build transaction pool (FIFO order)
      const pool = await this.buildTransactionPool(householdId, month, trx);

      // 2. Validate total doesn't exceed available
      const totalRequested = categoryAssignments.reduce((sum, a) => sum + a.amount, 0);
      const totalTransactionAvailable = pool.reduce((sum, t) => sum + t.available, 0);

      // Check total available including Opening Balances (To Be Assigned)
      const currentToBeAssigned = await AssignmentService.getToBeAssigned(householdId, month);

      const totalAvailable = Math.max(currentToBeAssigned, totalTransactionAvailable);

      // If we have enough transaction money, use that check (it's more specific).
      // If not, check if we have enough TOTAL money (transactions + opening balances).
      // Logic: If totalRequested > totalTransactionAvailable check if totalRequested <= currentToBeAssigned.
      // However, currentToBeAssigned INCLUDES totalTransactionAvailable implicitly (as income).
      // So comparing against currentToBeAssigned is the correct "Global" check.

      if (totalRequested > currentToBeAssigned && totalRequested > totalTransactionAvailable) {
        // Allow small floating point error margin
        if (totalRequested - totalAvailable > 0.01) {
          throw new BadRequestError(
            `Insufficient funds: $${totalRequested.toFixed(2)} requested, $${totalAvailable.toFixed(2)} available`
          );
        }
      }

      // 3. Assign to each category/section using FIFO
      const createdAssignments: IncomeAssignment[] = [];

      for (const { category_id, section_id, amount } of categoryAssignments) {
        if (amount <= 0) continue;

        // Validate either category or section exists and belongs to household
        if (category_id) {
          const category = await trx('categories')
            .join('category_sections', 'categories.section_id', 'category_sections.id')
            .where({ 'categories.id': category_id, 'category_sections.household_id': householdId })
            .first();

          if (!category) {
            throw new NotFoundError(`Category ${category_id} not found`);
          }
        } else if (section_id) {
          const section = await trx('category_sections')
            .where({ id: section_id, household_id: householdId })
            .first();

          if (!section) {
            throw new NotFoundError(`Section ${section_id} not found`);
          }
        } else {
          throw new BadRequestError('Either category_id or section_id must be provided');
        }

        let remaining = amount;

        // Assign from pool transactions (FIFO)
        for (const transaction of pool) {
          if (remaining <= 0) break;
          if (transaction.available <= 0) continue;

          const toAssign = Math.min(transaction.available, remaining);

          // Create assignment record
          const [assignment] = await trx('income_assignments')
            .insert({
              household_id: householdId,
              income_transaction_id: transaction.id,
              category_id: category_id || null,
              section_id: section_id || null,
              amount: toAssign,
              month: month,
              notes: null,
              created_by_user_id: userId,
            })
            .returning('*');

          createdAssignments.push({
            ...assignment,
            amount: Number(assignment.amount),
          });

          // Update transaction available balance
          transaction.available -= toAssign;
          remaining -= toAssign;
        }

        // If remaining > 0, it means we ran out of Transaction money. 
        // We must fund the rest from "Opening Balances" (loose cash) via assignAccountBalance logic.
        if (remaining > 0.001) {
          if (category_id) {
            // Use BudgetService to assign loose balance
            await BudgetService.assignAccountBalance(householdId, userId, {
              category_id: category_id,
              amount: remaining,
              month,
              // We don't specify account_id, so it pulls from the general pool of starting balances
            });

            // We don't need to add to createdAssignments array because assignAccountBalance 
            // does not create an income_assignment, it creates account_balance_assignment.
            // However, for the frontend response, we might want to reflect success.
            // But existing type IncomeAssignment might not match.
            // For now, we proceed as this fulfills the financial movement.

            remaining = 0;
          } else if (section_id) {
            await BudgetService.assignAccountBalance(householdId, userId, {
              section_id: section_id,
              amount: remaining,
              month,
            });

            remaining = 0;
          }
        }

        if (remaining > 0.01) {
          // Allow for small floating point errors
          const targetId = category_id || section_id;
          const targetType = category_id ? 'category' : 'section';
          throw new BadRequestError(
            `Could not fully assign $${amount.toFixed(2)} to ${targetType} ${targetId}. ` +
            `$${remaining.toFixed(2)} remaining unassigned.`
          );
        }
      }

      // 4. Update budget_allocations.assigned_amount for all categories/sections
      for (const { category_id, section_id } of categoryAssignments) {
        // Calculate total assigned to this category or section
        const query = trx('income_assignments')
          .where({ household_id: householdId, month });

        if (category_id) {
          query.where({ category_id });
        } else {
          query.where({ section_id });
        }

        const incomeAssignedResult = await query.sum('amount as total').first();
        const incomeAssigned = Number(incomeAssignedResult?.total || 0);

        const balanceAssignedResult = await trx('account_balance_assignments')
          .where({ household_id: householdId, month })
          .modify(qb => {
            if (category_id) {
              qb.where({ category_id });
            } else {
              qb.where({ section_id });
            }
          })
          .sum('amount as total')
          .first();
        const balanceAssigned = Number(balanceAssignedResult?.total || 0);
        const totalAssigned = incomeAssigned + balanceAssigned;

        // Get budget month
        const monthDate = new Date(`${month}-01`);
        const budgetMonth = await BudgetService.getOrCreateBudgetMonth(householdId, monthDate);

        // Find or create allocation
        const whereClause: any = { budget_month_id: budgetMonth.id };
        if (category_id) {
          whereClause.category_id = category_id;
        } else {
          whereClause.section_id = section_id;
          whereClause.category_id = null; // Rollup mode
        }

        let allocation = await trx('budget_allocations')
          .where(whereClause)
          .first();

        if (allocation) {
          await trx('budget_allocations')
            .where({ id: allocation.id })
            .update({ assigned_amount: totalAssigned, updated_at: trx.fn.now() });
        } else {
          await trx('budget_allocations')
            .insert({
              budget_month_id: budgetMonth.id,
              category_id: category_id || null,
              section_id: section_id || null,
              allocated_amount: 0,
              assigned_amount: totalAssigned,
              rollup_mode: !!section_id,
            });
        }
      }

      logger.info(`Assigned money to ${categoryAssignments.length} categories using FIFO matching`);

      return {
        assignments: createdAssignments,
        total_assigned: createdAssignments.reduce((sum, a) => sum + a.amount, 0),
        remaining: totalAvailable - totalRequested,
      };
    });
  }

  /**
   * Auto-assign all available money to underfunded categories/sections
   * Uses proportional distribution if insufficient funds
   */
  static async autoAssignAll(
    householdId: string,
    userId: string,
    month: string
  ): Promise<AutoAssignmentResult> {
    // 1. Get budget summary
    const monthDate = new Date(`${month}-01`);
    const summary = await BudgetService.getBudgetSummary(householdId, monthDate);

    // 2. Get underfunded items (categories or rollup sections, need > 0, excluding Income section)
    const underfundedItems: Array<{ id: string; need: number; isSection: boolean }> = [];

    for (const section of summary.sections) {
      // Skip Income section
      if (section.section_type === 'income') continue;

      // If section is in rollup mode and needs money, add the section itself
      if (section.rollup_mode && section.need > 0) {
        underfundedItems.push({
          id: section.section_id,
          need: section.need,
          isSection: true,
        });
      }

      // Add individual categories that need money (if not rollup)
      if (!section.rollup_mode) {
        for (const category of section.categories) {
          if (category.need > 0) {
            underfundedItems.push({
              id: category.category_id,
              need: category.need,
              isSection: false,
            });
          }
        }
      }
    }

    if (underfundedItems.length === 0) {
      return {
        assignments: [],
        total_assigned: 0,
        remaining: summary.to_be_assigned,
      };
    }

    // 3. Calculate distribution
    const totalNeed = underfundedItems.reduce((sum, item) => sum + item.need, 0);
    const available = summary.to_be_assigned;

    if (available <= 0) {
      return {
        assignments: [],
        total_assigned: 0,
        remaining: 0,
      };
    }

    // Build assignment requests
    const assignments: CategoryAssignmentRequest[] = underfundedItems.map((item) => {
      let amount: number;

      if (available >= totalNeed) {
        // Full funding - give each item exactly what it needs
        amount = item.need;
      } else {
        // Proportional distribution
        amount = (item.need / totalNeed) * available;
      }

      return {
        ...(item.isSection ? { section_id: item.id } : { category_id: item.id }),
        amount: Math.round(amount * 100) / 100, // Round to 2 decimals
      };
    });

    // 4. Use assignToCategories with calculated amounts
    return await this.assignToCategories(householdId, userId, month, assignments);
  }
}
