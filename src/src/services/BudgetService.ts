import knex from '../config/knex';
import type { Knex } from 'knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import { CategoryService } from './CategoryService';
import { IncomeService } from './IncomeService';
import { AnalyticsService } from './AnalyticsService';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface BudgetMonth {
  id: string;
  household_id: string;
  month: Date;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BudgetAllocation {
  id: string;
  budget_month_id: string;
  category_id: string | null;
  section_id: string | null;
  allocated_amount: number;
  assigned_amount: number; // NEW - actual cash assigned
  rollup_mode: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AllocationInput {
  category_id?: string;
  section_id?: string;
  allocated_amount: number;
  rollup_mode: boolean;
  notes?: string;
}

interface CategorySummary {
  category_id: string;
  category_name: string;
  is_archived: boolean;
  allocated: number;      // Budgeted amount (the plan)
  assigned: number;       // Assigned amount (reality - actual cash)
  spent: number;          // Actual spending
  remaining: number;      // allocated - spent (budget tracking)
  available: number;      // assigned - spent (envelope tracking)
  need: number;           // allocated - assigned (how much more needed)
  activity: number;
  allocation_notes: string | null;
}

interface SectionSummary {
  section_id: string;
  section_name: string;
  section_type: string;
  allocated: number;      // Budgeted amount (the plan)
  assigned: number;       // Assigned amount (reality - actual cash)
  spent: number;          // Actual spending
  remaining: number;      // allocated - spent (budget tracking)
  available: number;      // assigned - spent (envelope tracking)
  need: number;           // allocated - assigned (how much more needed)
  categories: CategorySummary[];
  rollup_mode: boolean;
  allocation_notes: string | null;
}

interface BudgetSummary {
  month: Date;
  month_notes: string | null;

  // INCOME
  total_planned_income: number;   // From income_sources (the plan)
  total_real_income: number;      // From transactions (reality)
  income_variance: number;        // Actual vs planned

  // BUDGET
  total_allocated: number;        // Budgeted amount (the plan)
  total_assigned: number;         // Assigned amount (reality)
  to_be_assigned: number;         // Real income not yet assigned

  // SPENDING
  total_spent: number;
  total_remaining: number;        // Budget tracking (allocated - spent)
  total_available: number;        // Envelope tracking (assigned - spent)

  sections: SectionSummary[];
}

export class BudgetService {
  /**
   * Get or create budget month
   * Automatically copies allocations from previous month if creating new month
   */
  static async getOrCreateBudgetMonth(
    householdId: string,
    month: Date,
    trx: Knex | Knex.Transaction = knex
  ): Promise<BudgetMonth> {
    // Normalize to first of month
    const normalizedMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    let budgetMonth = await trx('budget_months')
      .where({
        household_id: householdId,
        month: normalizedMonth
      })
      .first();

    if (!budgetMonth) {
      // Budget month doesn't exist - create it and copy from previous month
      const previousMonth = new Date(normalizedMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      // Check if previous month's budget exists
      const previousBudget = await trx('budget_months')
        .where({
          household_id: householdId,
          month: previousMonth
        })
        .first();

      // Create new budget month
      [budgetMonth] = await trx('budget_months')
        .insert({
          household_id: householdId,
          month: normalizedMonth
        })
        .returning('*');

      await AnalyticsService.recordEvent(
        'budget_month_created',
        householdId,
        null,
        {
          month: normalizedMonth.toISOString().slice(0, 10),
          copiedFromPrevious: !!previousBudget,
        },
        trx
      );

      // If previous month exists, copy its allocations
      if (previousBudget) {
        const previousAllocations = await trx('budget_allocations')
          .where({ budget_month_id: previousBudget.id });

        if (previousAllocations.length > 0) {
          // Copy allocations to new month
          const newAllocations = previousAllocations.map((alloc: { category_id: string | null; section_id: string | null; allocated_amount: number; rollup_mode: boolean; notes: string | null }) => ({
            budget_month_id: budgetMonth.id,
            category_id: alloc.category_id,
            section_id: alloc.section_id,
            allocated_amount: alloc.allocated_amount,
            rollup_mode: alloc.rollup_mode,
            notes: alloc.notes
          }));

          await trx('budget_allocations').insert(newAllocations);

          logger.info(`Budget month ${normalizedMonth.toISOString()} created for household ${householdId} with ${newAllocations.length} allocations copied from previous month`);
        } else {
          logger.info(`Budget month ${normalizedMonth.toISOString()} created for household ${householdId} (previous month had no allocations)`);
        }
      } else {
        logger.info(`Budget month ${normalizedMonth.toISOString()} created for household ${householdId} (no previous month found)`);
      }
    }

    return budgetMonth;
  }

  /**
   * Update budget month notes
   */
  static async updateBudgetMonth(
    householdId: string,
    month: Date,
    notes: string
  ): Promise<BudgetMonth> {
    const budgetMonth = await this.getOrCreateBudgetMonth(householdId, month);

    const [updated] = await knex('budget_months')
      .where({ id: budgetMonth.id })
      .update({
        notes,
        updated_at: knex.fn.now()
      })
      .returning('*');

    return updated;
  }

  /**
   * Set a single budget allocation (category or section level)
   */
  static async setAllocation(
    householdId: string,
    month: Date,
    data: AllocationInput
  ): Promise<BudgetAllocation> {
    const budgetMonth = await this.getOrCreateBudgetMonth(householdId, month);

    // Verify category or section belongs to household
    if (data.category_id) {
      await CategoryService.getCategoryById(data.category_id, householdId);
    }

    let section;
    if (data.section_id) {
      section = await CategoryService.getSectionById(data.section_id, householdId);
    }

    // Validate rollup mode based on section type
    if (data.category_id) {
      // Category-level allocation - get section from category
      const category = await CategoryService.getCategoryById(data.category_id, householdId);
      section = await CategoryService.getSectionById(category.section_id, householdId);
    }

    if (section) {
      // Fixed and Debt sections MUST use category-level allocation
      if (section.type === 'fixed' || section.type === 'debt') {
        if (data.rollup_mode === true) {
          throw new BadRequestError(
            `${section.type === 'fixed' ? 'Fixed' : 'Debt'} sections must allocate to individual categories`
          );
        }
        if (!data.category_id) {
          throw new BadRequestError(
            `Must specify a category for ${section.type} section allocation`
          );
        }
      }

      // Flexible sections SHOULD use section-level allocation (rollup mode)
      // BUT we allow individual allocations for flexibility (e.g. Budget Setup Wizard uses individual categories)
      /* 
      if (section.type === 'flexible') {
        if (data.rollup_mode === false && data.category_id) {
          throw new BadRequestError(
            'Flexible sections should use section-level allocation (rollup mode). Allocate to the section, not individual categories.'
          );
        }
        if (data.rollup_mode === true && !data.section_id) {
          throw new BadRequestError(
            'Flexible sections require section_id when using rollup mode'
          );
        }
      } 
      */
    }

    // Check if allocation already exists
    const existingAllocation = await knex('budget_allocations')
      .where({
        budget_month_id: budgetMonth.id,
        ...(data.category_id ? { category_id: data.category_id } : {}),
        ...(data.section_id ? { section_id: data.section_id } : {})
      })
      .first();

    if (existingAllocation) {
      // Update existing allocation
      const [updated] = await knex('budget_allocations')
        .where({ id: existingAllocation.id })
        .update({
          allocated_amount: data.allocated_amount,
          notes: data.notes || null,
          updated_at: knex.fn.now()
        })
        .returning('*');

      return updated;
    } else {
      // Create new allocation
      const [allocation] = await knex('budget_allocations')
        .insert({
          budget_month_id: budgetMonth.id,
          category_id: data.category_id || null,
          section_id: data.section_id || null,
          allocated_amount: data.allocated_amount,
          rollup_mode: data.rollup_mode,
          notes: data.notes || null
        })
        .returning('*');

      return allocation;
    }
  }

  /**
   * Bulk set allocations (useful for setting entire budget at once)
   */
  static async bulkSetAllocations(
    householdId: string,
    month: Date,
    allocations: AllocationInput[]
  ): Promise<BudgetAllocation[]> {
    const results = await Promise.all(
      allocations.map(allocation =>
        this.setAllocation(householdId, month, allocation)
      )
    );

    return results;
  }

  /**
   * Get budget summary with spending for a month
   */
  static async getBudgetSummary(
    householdId: string,
    month: Date
  ): Promise<BudgetSummary> {
    const budgetMonth = await this.getOrCreateBudgetMonth(householdId, month);

    // Get all allocations for this month
    const allocations = await knex('budget_allocations')
      .where({ budget_month_id: budgetMonth.id });

    // Get all sections and categories
    const sections = await CategoryService.getAllSections(householdId);
    const categories = await knex('categories')
      .where({ household_id: householdId });

    // Calculate spending for the month
    // Use UTC methods to avoid timezone issues
    const monthStart = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Get Income section IDs to exclude from spending calculation
    const incomeSections = await knex('category_sections')
      .where({ household_id: householdId, name: 'Income' })
      .select('id');

    const incomeSectionIds = incomeSections.map(s => s.id);

    // Get all transactions for this month grouped by category
    // Exclude Income categories from spending calculation
    const spendingByCategory = await knex('transactions')
      .where({ household_id: householdId })
      .whereBetween('transaction_date', [monthStart, monthEnd])
      .whereNotNull('category_id')
      .whereNotIn('category_id', function () {
        this.select('id')
          .from('categories')
          .whereIn('section_id', incomeSectionIds);
      })
      .select('category_id')
      .sum('amount as total_spent')
      .groupBy('category_id');

    // Create a map of category spending
    const spendingMap = new Map(
      spendingByCategory.map(row => [
        row.category_id,
        Math.abs(Number(row.total_spent)) // Convert to positive for spending
      ])
    );

    // Get extra money assignments made at section level for this month
    const extraMoneySectionAssignments = await knex('extra_money_assignments as ema')
      .join('extra_money_entries as eme', 'ema.extra_money_entry_id', 'eme.id')
      .where({ 'eme.household_id': householdId })
      .whereNotNull('ema.section_id')
      .whereBetween('eme.received_date', [monthStart, monthEnd])
      .select('ema.section_id')
      .sum('ema.amount as total')
      .groupBy('ema.section_id');

    const extraMoneySectionMap = new Map(
      extraMoneySectionAssignments.map(row => [
        row.section_id,
        Number(row.total || 0)
      ])
    );

    // Build section summaries (exclude Income section from budget)
    const sectionSummaries: SectionSummary[] = sections
      .filter(section => section.name !== 'Income')
      .map(section => {
        const sectionCategories = categories.filter(cat => cat.section_id === section.id);

        // Check if there's a section-level allocation (rollup mode)
        const sectionAllocation = allocations.find(
          alloc => alloc.section_id === section.id && alloc.rollup_mode
        );

        let sectionAllocated = 0;
        let sectionSpent = 0;
        const categorySummaries: CategorySummary[] = [];

        let sectionAssigned = 0; // Track assigned amount for section

        if (sectionAllocation) {
          // Rollup mode: single allocation for entire section
          sectionAllocated = Number(sectionAllocation.allocated_amount);
          sectionAssigned = Number(sectionAllocation.assigned_amount || 0);

          // Calculate total spending for all categories in section
          sectionCategories.forEach(category => {
            const spent = spendingMap.get(category.id) || 0;
            sectionSpent += spent;

            categorySummaries.push({
              category_id: category.id,
              category_name: category.name,
              is_archived: !!category.is_archived,
              allocated: 0, // No individual allocation in rollup mode
              assigned: 0,  // No individual assignment in rollup mode
              spent,
              remaining: 0,
              available: 0,
              need: 0,
              activity: spent,
              allocation_notes: null
            });
          });
        } else {
          // Category-level allocations
          sectionCategories.forEach(category => {
            const categoryAllocation = allocations.find(
              alloc => alloc.category_id === category.id
            );

            const allocated = categoryAllocation
              ? Number(categoryAllocation.allocated_amount)
              : 0;
            const assigned = categoryAllocation
              ? Number(categoryAllocation.assigned_amount || 0)
              : 0;
            const spent = spendingMap.get(category.id) || 0;
            const remaining = allocated - spent;
            const available = assigned - spent;
            const need = allocated - assigned;

            sectionAllocated += allocated;
            sectionAssigned += assigned;
            sectionSpent += spent;

            categorySummaries.push({
              category_id: category.id,
              category_name: category.name,
              is_archived: !!category.is_archived,
              allocated,
              assigned,
              spent,
              remaining,
              available,
              need,
              activity: spent,
              allocation_notes: categoryAllocation?.notes || null
            });
          });
        }

        const extraSectionAssigned = extraMoneySectionMap.get(section.id) || 0;
        sectionAssigned += extraSectionAssigned;

        return {
          section_id: section.id,
          section_name: section.name,
          section_type: section.type,
          allocated: sectionAllocated,
          assigned: sectionAssigned,
          spent: sectionSpent,
          remaining: sectionAllocated - sectionSpent,
          available: sectionAssigned - sectionSpent,
          need: sectionAllocated - sectionAssigned,
          categories: categorySummaries,
          rollup_mode: !!sectionAllocation,
          allocation_notes: sectionAllocation?.notes || null
        };
      });

    // Calculate totals
    const totalAllocated = sectionSummaries.reduce((sum, sec) => sum + sec.allocated, 0);
    const totalAssigned = sectionSummaries.reduce((sum, sec) => sum + sec.assigned, 0);
    const totalSpent = sectionSummaries.reduce((sum, sec) => sum + sec.spent, 0);

    const savingsReserveResult = await knex('extra_money_entries')
      .where({ household_id: householdId })
      .whereBetween('received_date', [monthStart, monthEnd])
      .sum('savings_reserve as total')
      .first();

    const totalSavingsReserve = Number(savingsReserveResult?.total || 0);
    const totalAssignedWithReserve = totalAssigned + totalSavingsReserve;

    // Get total monthly PLANNED income from income sources
    const totalPlannedIncome = await IncomeService.getTotalMonthlyIncome(householdId);

    // Get total monthly ACTUAL income from transactions
    // (monthStart and monthEnd already declared above)
    const realIncomeResult = await knex('transactions')
      .where({ household_id: householdId })
      .whereBetween('transaction_date', [monthStart, monthEnd])
      .where('amount', '>', 0)
      .sum('amount as total')
      .first();

    const totalRealIncome = Number(realIncomeResult?.total || 0);

    // Get total account starting balances
    const accountBalancesResult = await knex('accounts')
      .where({ household_id: householdId, is_active: true })
      .sum('starting_balance as total')
      .first();

    const totalAccountBalances = Number(accountBalancesResult?.total || 0);

    const monthString = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;

    const incomeAssignedResult = await knex('income_assignments')
      .where({ household_id: householdId, month: monthString })
      .sum('amount as total')
      .first();
    const totalIncomeAssigned = Number(incomeAssignedResult?.total || 0);

    // Account balance assignments are a one-time pool; subtract all-time to avoid reappearing each month
    const assignedBalancesResult = await knex('account_balance_assignments')
      .where({ household_id: householdId })
      .sum('amount as total')
      .first();
    const totalAssignedBalances = Number(assignedBalancesResult?.total || 0);

    // Calculate income variance and "To Be Assigned"
    // Available = (Real Income + Opening Balances) - (Income Assigned this month + Opening Balance Assigned all-time + Savings Reserve this month)
    const incomeVariance = totalRealIncome - totalPlannedIncome;
    const toBeAssigned = (totalRealIncome + totalAccountBalances) - (totalIncomeAssigned + totalAssignedBalances + totalSavingsReserve);

    // Calculate Goals summary (virtual section)
    const goalsContributionsResult = await knex('goal_contributions')
      .join('goals', 'goal_contributions.goal_id', 'goals.id')
      .where({ 'goals.household_id': householdId })
      .whereBetween('goal_contributions.created_at', [monthStart, monthEnd])
      .sum('goal_contributions.amount as total')
      .first();

    const totalGoalContributions = Number(goalsContributionsResult?.total || 0);

    // Get active goals and calculate monthly contributions needed
    const activeGoals = await knex('goals')
      .where({ household_id: householdId, is_completed: false })
      .select('*');

    // Calculate total planned monthly contributions
    const totalPlannedGoalContributions = activeGoals.reduce((sum, goal) => {
      // Calculate monthly contribution needed if target date is set
      if (goal.target_date) {
        const today = new Date();
        const targetDate = new Date(goal.target_date);
        const monthsRemaining = Math.max(
          (targetDate.getFullYear() - today.getFullYear()) * 12 +
          (targetDate.getMonth() - today.getMonth()),
          1 // At least 1 month
        );
        const remaining = Number(goal.target_amount) - Number(goal.current_amount);
        const monthlyNeeded = Math.ceil(remaining / monthsRemaining * 100) / 100;
        return sum + monthlyNeeded;
      }
      return sum;
    }, 0);

    // Add Goals as a virtual section
    const goalsSummary = {
      section_id: 'goals-virtual',
      section_name: 'Goals',
      section_type: 'goals',
      allocated: totalPlannedGoalContributions,  // Planned monthly contributions
      assigned: totalGoalContributions,          // Actual contributions made
      spent: totalGoalContributions,             // Same as assigned (money "spent" on goals)
      remaining: totalPlannedGoalContributions - totalGoalContributions,
      available: 0,                              // Goal money is immediately "spent"
      need: totalPlannedGoalContributions - totalGoalContributions,
      categories: [],                            // Don't show individual goals here
      rollup_mode: true,
      allocation_notes: null
    };

    // Add goals section if there are active goals or contributions
    const savingsReserveSummary = {
      section_id: 'savings-reserve',
      section_name: 'Savings Reserve',
      section_type: 'savings_reserve',
      allocated: 0,
      assigned: totalSavingsReserve,
      spent: 0,
      remaining: 0,
      available: totalSavingsReserve,
      need: 0,
      categories: [],
      rollup_mode: true,
      allocation_notes: null
    };

    const sectionsWithGoals = totalGoalContributions > 0 || activeGoals.length > 0
      ? [...sectionSummaries, goalsSummary]
      : sectionSummaries;

    const allSections = totalSavingsReserve > 0
      ? [...sectionsWithGoals, savingsReserveSummary]
      : sectionsWithGoals;

    const result = {
      month: budgetMonth.month,
      month_notes: budgetMonth.notes,

      // INCOME
      total_planned_income: totalPlannedIncome,
      total_real_income: totalRealIncome,
      income_variance: incomeVariance,

      // BUDGET
      total_allocated: totalAllocated,
      total_assigned: totalAssignedWithReserve,
      to_be_assigned: toBeAssigned,

      // SPENDING
      total_spent: totalSpent,
      total_remaining: totalAllocated - totalSpent,
      total_available: totalAssignedWithReserve - totalSpent,

      sections: allSections
    };

    logger.info(`Budget summary calculated: ${JSON.stringify({
      total_planned_income: result.total_planned_income,
      total_real_income: result.total_real_income,
      total_assigned: result.total_assigned,
      to_be_assigned: result.to_be_assigned
    })}`);

    return result;
  }

  /**
   * Delete an allocation
   */
  static async deleteAllocation(
    householdId: string,
    allocationId: string
  ): Promise<void> {
    const allocation = await knex('budget_allocations')
      .where({ id: allocationId })
      .first();

    if (!allocation) {
      throw new NotFoundError('Allocation not found');
    }

    // Verify the allocation belongs to this household
    const budgetMonth = await knex('budget_months')
      .where({ id: allocation.budget_month_id })
      .first();

    if (!budgetMonth || budgetMonth.household_id !== householdId) {
      throw new NotFoundError('Allocation not found');
    }

    await knex('budget_allocations')
      .where({ id: allocationId })
      .del();
  }

  /**
   * Get all allocations for a month
   */
  static async getAllocations(
    householdId: string,
    month: Date
  ): Promise<BudgetAllocation[]> {
    const budgetMonth = await this.getOrCreateBudgetMonth(householdId, month);

    const allocations = await knex('budget_allocations')
      .where({ budget_month_id: budgetMonth.id });

    return allocations;
  }

  /**
   * Assign account balance to a category
   * Used during wizard setup when users assign their existing account balances to categories
   * This is separate from regular income-based assignments
   */
  static async assignAccountBalance(
    householdId: string,
    userId: string,
    data: {
      category_id?: string;
      section_id?: string;
      account_id?: string | null;
      amount: number;
      month?: string;
    }
  ): Promise<BudgetAllocation> {
    const monthDate = data.month ? new Date(`${data.month}-01`) : new Date();
    const budgetMonth = await this.getOrCreateBudgetMonth(householdId, monthDate);
    const monthString = data.month || new Date(budgetMonth.month).toISOString().slice(0, 7);

    if (!data.category_id && !data.section_id) {
      throw new BadRequestError('Either category_id or section_id is required');
    }
    if (data.category_id && data.section_id) {
      throw new BadRequestError('Cannot assign to both category and section');
    }

    if (data.category_id) {
      await CategoryService.getCategoryById(data.category_id, householdId);
    }
    if (data.section_id) {
      await CategoryService.getSectionById(data.section_id, householdId);
    }

    // 1. Create account_balance_assignment record
    await knex('account_balance_assignments').insert({
      id: uuidv4(),
      household_id: householdId,
      account_id: data.account_id || null,
      category_id: data.category_id || null,
      section_id: data.section_id || null,
      amount: data.amount,
      month: monthString,
      assigned_by_user_id: userId
    });

    // 2. Find or create budget allocation for this category
    const whereClause: any = { budget_month_id: budgetMonth.id };
    if (data.category_id) {
      whereClause.category_id = data.category_id;
    } else {
      whereClause.section_id = data.section_id;
      whereClause.category_id = null;
    }

    let allocation = await knex('budget_allocations')
      .where(whereClause)
      .first();

    if (!allocation) {
      // Create new allocation if it doesn't exist
      [allocation] = await knex('budget_allocations')
        .insert({
          budget_month_id: budgetMonth.id,
          category_id: data.category_id || null,
          section_id: data.section_id || null,
          allocated_amount: 0,
          assigned_amount: data.amount,
          rollup_mode: !!data.section_id,
          notes: null
        })
        .returning('*');

      logger.info(`Created new allocation for ${data.category_id ? 'category' : 'section'} ${data.category_id || data.section_id} with assigned amount ${data.amount}`);
    } else {
      // Update existing allocation - increment assigned_amount
      [allocation] = await knex('budget_allocations')
        .where({ id: allocation.id })
        .increment('assigned_amount', data.amount)
        .returning('*');

      logger.info(`Updated allocation ${allocation.id} - added ${data.amount} to assigned_amount`);
    }

    return allocation;
  }
}
