import knex from '../config/knex';
import { v4 as uuidv4 } from 'uuid';
import type { Knex } from 'knex';
import { CategoryService } from './CategoryService';
import { BudgetService } from './BudgetService';
import { AnalyticsService } from './AnalyticsService';

export interface ExtraMoneyEntry {
  id: string;
  household_id: string;
  transaction_id: string | null;
  source: string;
  amount: number;
  received_date: string;
  notes: string | null;
  auto_detected: boolean;
  detection_reason: string | null;
  savings_reserve: number;
  status: 'pending' | 'assigned' | 'ignored';
  assigned_at: string | null;
  assigned_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtraMoneyAssignment {
  id: string;
  extra_money_entry_id: string;
  category_id: string | null;
  section_id: string | null;
  amount: number;
  assigned_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExtraMoneyWithAssignments extends ExtraMoneyEntry {
  assignments: Array<{
    category_id: string | null;
    category_name: string | null;
    section_id: string | null;
    section_name: string | null;
    amount: number;
  }>;
}

export interface ExtraMoneyPreference {
  id: string;
  household_id: string;
  category_percentages: Record<string, number>; // category_id -> decimal (0.00-1.00)
  section_percentages?: Record<string, number>; // section_id -> decimal
  default_categories: Record<string, string>;
  default_sections?: Record<string, string>;
  reserve_percentage?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecommendedAssignment {
  category_id?: string | null;
  category_name?: string | null;
  section_id?: string | null;
  section_name?: string | null;
  amount: number;
  percentage: number; // Display as 0-100
  type?: 'category' | 'section' | 'reserve';
}

// Keywords that indicate irregular income (bonus, gift, refund, etc.)
const EXTRA_MONEY_KEYWORDS = [
  'bonus',
  'gift',
  'refund',
  'tax refund',
  'rebate',
  'settlement',
  'inheritance',
  'windfall',
  'reimbursement',
  'award',
  'prize',
  'lottery',
  'dividend',
  'capital gain',
  'commission',
  'overtime',
  'signing bonus',
  'holiday bonus',
  'year-end bonus',
  'performance bonus'
];

export class ExtraMoneyService {
  private static async normalizePreferences(
    householdId: string,
    preferences: {
      category_percentages: Record<string, number>;
      section_percentages?: Record<string, number>;
      default_categories: Record<string, string>;
      default_sections?: Record<string, string>;
      reserve_percentage?: number;
    }
  ): Promise<{
    normalized: {
      category_percentages: Record<string, number>;
      section_percentages: Record<string, number>;
      default_categories: Record<string, string>;
      default_sections: Record<string, string>;
      reserve_percentage: number;
    };
    changed: boolean;
  }> {
    const originalCategoryPercentages = preferences.category_percentages || {};
    const originalSectionPercentages = preferences.section_percentages || {};
    const originalDefaultCategories = preferences.default_categories || {};
    const originalDefaultSections = preferences.default_sections || {};

    const { donationsCategoryId, helpingCategoryId, flexibleSectionId } =
      await this.ensureGivingCategories(householdId);

    const categoryIds = Object.keys(originalCategoryPercentages);
    const validCategories = categoryIds.length > 0
      ? await knex('categories')
          .where({ household_id: householdId })
          .whereIn('id', categoryIds)
          .select('id')
      : [];
    const validCategoryIds = new Set(validCategories.map(cat => cat.id));

    const sectionIds = Object.keys(originalSectionPercentages);
    const validSections = sectionIds.length > 0
      ? await knex('category_sections')
          .where({ household_id: householdId })
          .whereIn('id', sectionIds)
          .select('id')
      : [];
    const validSectionIds = new Set(validSections.map(sec => sec.id));

    const normalizedCategoryPercentages: Record<string, number> = {};
    for (const [id, percentage] of Object.entries(originalCategoryPercentages)) {
      if (validCategoryIds.has(id)) {
        normalizedCategoryPercentages[id] = percentage;
      }
    }

    const normalizedDefaultCategories: Record<string, string> = { ...originalDefaultCategories };

    const givingSourceId = originalDefaultCategories.giving;
    const givingPercent = givingSourceId ? originalCategoryPercentages[givingSourceId] : undefined;
    if (!givingSourceId || !validCategoryIds.has(givingSourceId)) {
      normalizedDefaultCategories.giving = donationsCategoryId;
      if (givingPercent !== undefined) {
        normalizedCategoryPercentages[donationsCategoryId] = givingPercent;
      }
    }

    const helpingSourceId = originalDefaultCategories.helping;
    const helpingPercent = helpingSourceId ? originalCategoryPercentages[helpingSourceId] : undefined;
    if (!helpingSourceId || !validCategoryIds.has(helpingSourceId)) {
      normalizedDefaultCategories.helping = helpingCategoryId;
      if (helpingPercent !== undefined) {
        normalizedCategoryPercentages[helpingCategoryId] = helpingPercent;
      }
    }

    const debtSection = await knex('category_sections')
      .where({ household_id: householdId, type: 'debt' })
      .orderBy('sort_order', 'asc')
      .first();

    const normalizedSectionPercentages: Record<string, number> = {};
    for (const [id, percentage] of Object.entries(originalSectionPercentages)) {
      if (validSectionIds.has(id)) {
        normalizedSectionPercentages[id] = percentage;
      }
    }

    const normalizedDefaultSections: Record<string, string> = { ...originalDefaultSections };

    const funSourceId = originalDefaultSections.fun;
    const funPercent = funSourceId ? originalSectionPercentages[funSourceId] : undefined;
    if (!funSourceId || !validSectionIds.has(funSourceId)) {
      normalizedDefaultSections.fun = flexibleSectionId;
      if (funPercent !== undefined) {
        normalizedSectionPercentages[flexibleSectionId] = funPercent;
      }
    }

    const debtSourceId = originalDefaultSections.debt;
    const debtPercent = debtSourceId ? originalSectionPercentages[debtSourceId] : undefined;
    if (!debtSourceId || !validSectionIds.has(debtSourceId)) {
      if (debtSection?.id) {
        normalizedDefaultSections.debt = debtSection.id;
      }
      if (debtSection?.id && debtPercent !== undefined) {
        normalizedSectionPercentages[debtSection.id] = debtPercent;
      }
    }

    const reservePercentage = Number(preferences.reserve_percentage || 0);

    const normalized = {
      category_percentages: normalizedCategoryPercentages,
      section_percentages: normalizedSectionPercentages,
      default_categories: normalizedDefaultCategories,
      default_sections: normalizedDefaultSections,
      reserve_percentage: reservePercentage
    };

    const changed = JSON.stringify({
      category_percentages: originalCategoryPercentages,
      section_percentages: originalSectionPercentages,
      default_categories: originalDefaultCategories,
      default_sections: originalDefaultSections,
      reserve_percentage: reservePercentage
    }) !== JSON.stringify(normalized);

    return { normalized, changed };
  }

  /**
   * Smart Detection Algorithm (Enhanced)
   * Analyzes positive transactions to identify potential extra money (irregular income)
   *
   * Detection criteria:
   * 1. Keyword Match: Payee/notes contain irregular income keywords
   * 2. Amount Anomaly: 150%+ larger than average positive transactions
   * 3. Frequency Mismatch: Income outside expected payment schedule (±2 day window)
   * 4. Store Refund Filter: Ignore Amazon, Kroger, Walmart, etc. refunds
   * 5. Configurable Threshold: Respect household's minimum detection amount
   */
  static async detectExtraMoney(
    householdId: string,
    transactionId: string,
    trx: Knex | Knex.Transaction = knex
  ): Promise<{ shouldFlag: boolean; reason: string | null }> {
    // Get the transaction
    const transaction = await trx('transactions')
      .where({ id: transactionId, household_id: householdId })
      .first();

    if (!transaction) {
      return { shouldFlag: false, reason: null };
    }

    // Only flag positive (income) transactions
    if (transaction.amount <= 0) {
      return { shouldFlag: false, reason: null };
    }

    // Skip if already linked to extra money entry
    const existingEntry = await trx('extra_money_entries')
      .where({ transaction_id: transactionId })
      .first();

    if (existingEntry) {
      return { shouldFlag: false, reason: null };
    }

    // CRITERION 5: CONFIGURABLE THRESHOLD (check early to avoid unnecessary processing)
    const settings = await trx('household_settings')
      .where({ household_id: householdId })
      .first();

    const threshold = settings?.extra_money_threshold || 100;

    if (transaction.amount < threshold) {
      return { shouldFlag: false, reason: 'Below detection threshold' };
    }

    // CRITERION 4: IGNORE STORE REFUNDS
    const searchText = `${transaction.payee || ''} ${transaction.notes || ''}`.toLowerCase();
    const storeRefundKeywords = ['amazon', 'kroger', 'walmart', 'meijer', 'target', 'costco', 'ebay'];
    const isStoreRefund = storeRefundKeywords.some(keyword =>
      searchText.includes(keyword) &&
      (searchText.includes('refund') || searchText.includes('return') || searchText.includes('credit'))
    );

    if (isStoreRefund) {
      return { shouldFlag: false, reason: 'Store refund - not extra money' };
    }

    const reasons: string[] = [];

    // 1. KEYWORD DETECTION
    const matchedKeyword = EXTRA_MONEY_KEYWORDS.find(keyword => searchText.includes(keyword));

    if (matchedKeyword) {
      reasons.push(`Matches irregular income pattern: "${matchedKeyword}"`);
    }

    // 2. AMOUNT ANOMALY DETECTION
    // Get average of recent positive transactions (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const incomeStats = await trx('transactions')
      .where({ household_id: householdId })
      .where('amount', '>', 0) // Positive only
      .where('transaction_date', '>=', threeMonthsAgo)
      .avg('amount as avg_amount')
      .count('* as count')
      .first();

    const avgIncome = Number(incomeStats?.avg_amount || 0);
    const incomeCount = Number(incomeStats?.count || 0);

    if (incomeCount >= 2 && transaction.amount > avgIncome * 1.5) {
      const percentLarger = Math.round(((transaction.amount - avgIncome) / avgIncome) * 100);
      reasons.push(`Amount is ${percentLarger}% larger than typical income`);
    }

    // 3. FREQUENCY MISMATCH DETECTION
    // Get household's expected income sources and frequencies
    const incomeSources = await trx('income_sources')
      .where({ household_id: householdId, is_active: true })
      .whereNotNull('frequency')
      .select('id', 'monthly_amount', 'frequency', 'expected_day_of_month', 'last_payment_date');

    let matchesExpectedIncome = false;

    for (const income of incomeSources) {
      // Check if amount is close to expected amount (±$50 tolerance)
      const isCloseMatch = Math.abs(transaction.amount - income.monthly_amount) < 50;

      if (!isCloseMatch) continue;

      // Check if transaction timing matches frequency (±2 day window)
      const expectedDate = this.calculateNextExpectedDate(
        income.frequency,
        income.expected_day_of_month,
        income.last_payment_date
      );

      const transactionDate = new Date(transaction.transaction_date);
      const daysDifference = Math.abs((transactionDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDifference <= 2) {
        matchesExpectedIncome = true;

        // Update last_payment_date for this income source
        await trx('income_sources')
          .where({ id: income.id })
          .update({ last_payment_date: transaction.transaction_date });

        break;
      }
    }

    // Flag if income does NOT match expected patterns (and no other reasons)
    if (!matchesExpectedIncome && reasons.length === 0 && incomeSources.length > 0) {
      reasons.push('Income transaction outside of expected frequency pattern');
    }

    if (incomeSources.length === 0) {
      reasons.push('No income sources on file to match this deposit');
    }

    // Decision: Flag if we have at least one strong reason
    const shouldFlag = reasons.length > 0;

    return {
      shouldFlag,
      reason: shouldFlag ? reasons.join('; ') : null
    };
  }

  /**
   * Calculate next expected payment date based on frequency
   * Helper function for frequency matching detection
   */
  private static calculateNextExpectedDate(
    frequency: string,
    expectedDayOfMonth: number | null,
    lastPaymentDate: string | null
  ): Date {
    const now = new Date();

    if (frequency === 'monthly' && expectedDayOfMonth) {
      // Expected on specific day of current month
      return new Date(now.getFullYear(), now.getMonth(), expectedDayOfMonth);
    }

    if (frequency === 'biweekly' && lastPaymentDate) {
      // 14 days after last payment
      const lastDate = new Date(lastPaymentDate);
      return new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    if (frequency === 'weekly' && lastPaymentDate) {
      // 7 days after last payment
      const lastDate = new Date(lastPaymentDate);
      return new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (frequency === 'semimonthly') {
      // Expected on 1st and 15th
      const day = now.getDate();
      return day < 15
        ? new Date(now.getFullYear(), now.getMonth(), 15)
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Default: return today (will not match strict 2-day window)
    return now;
  }

  /**
   * Create extra money entry (manual or auto-detected)
   */
  static async createExtraMoneyEntry(data: {
    household_id: string;
    transaction_id?: string | null;
    source: string;
    amount: number;
    received_date: string;
    notes?: string | null;
    auto_detected?: boolean;
    detection_reason?: string | null;
    savings_reserve?: number;
    user_id: string;
  }, trx: Knex | Knex.Transaction = knex): Promise<ExtraMoneyEntry> {
    const entry = await trx('extra_money_entries')
      .insert({
        id: uuidv4(),
        household_id: data.household_id,
        transaction_id: data.transaction_id || null,
        source: data.source,
        amount: data.amount,
        received_date: data.received_date,
        notes: data.notes || null,
        auto_detected: data.auto_detected || false,
        detection_reason: data.detection_reason || null,
        savings_reserve: data.savings_reserve || 0,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')
      .then(rows => rows[0]);

    return entry;
  }

  /**
   * Get all extra money entries for household
   */
  static async getAllEntries(
    householdId: string,
    status?: 'pending' | 'assigned' | 'ignored'
  ): Promise<ExtraMoneyWithAssignments[]> {
    const query = knex('extra_money_entries as eme')
      .where({ 'eme.household_id': householdId })
      .orderBy('eme.received_date', 'desc');

    if (status) {
      query.where({ 'eme.status': status });
    }

    const entries = await query.select('eme.*');

    // Load assignments for each entry
    const entriesWithAssignments = await Promise.all(
      entries.map(async (entry) => {
        const assignments = await knex('extra_money_assignments as ema')
          .leftJoin('categories as c', 'ema.category_id', 'c.id')
          .leftJoin('category_sections as cs', 'ema.section_id', 'cs.id')
          .where({ 'ema.extra_money_entry_id': entry.id })
          .select(
            'ema.category_id',
            'c.name as category_name',
            'ema.section_id',
            'cs.name as section_name',
            'ema.amount'
          );

        return {
          ...entry,
          assignments
        };
      })
    );

    return entriesWithAssignments;
  }

  /**
   * Get pending extra money entries (needs user review)
   */
  static async getPendingEntries(householdId: string): Promise<ExtraMoneyWithAssignments[]> {
    return await this.getAllEntries(householdId, 'pending');
  }

  /**
   * Assign extra money to categories
   */
  static async assignToCategories(
    extraMoneyId: string,
    householdId: string,
    userId: string,
    assignments: Array<{ category_id?: string | null; section_id?: string | null; amount: number }>,
    savingsReserve?: number
  ): Promise<ExtraMoneyEntry> {
    return await knex.transaction(async (trx) => {
      // 1. Verify entry exists and belongs to household
      const entry = await trx('extra_money_entries')
        .where({ id: extraMoneyId, household_id: householdId })
        .first();

      if (!entry) {
        throw new Error('Extra money entry not found');
      }

      // 2. Validate assignment amounts
      const totalAssigned = assignments.reduce((sum, a) => sum + a.amount, 0);
      const reserveAmount = typeof savingsReserve === 'number' ? savingsReserve : Number(entry.savings_reserve || 0);
      const requiredAssigned = Number(entry.amount) - reserveAmount;

      for (const assignment of assignments) {
        const hasCategory = !!assignment.category_id;
        const hasSection = !!assignment.section_id;
        if (hasCategory === hasSection) {
          throw new Error('Assignments must include either category_id or section_id');
        }
        if (assignment.category_id) {
          await CategoryService.getCategoryById(assignment.category_id, householdId);
        }
        if (assignment.section_id) {
          await CategoryService.getSectionById(assignment.section_id, householdId);
        }
      }

      if (Math.abs(totalAssigned - requiredAssigned) > 0.01) {
        throw new Error(
          `Assignment total ($${totalAssigned}) doesn't match assignable amount ($${requiredAssigned})`
        );
      }

      // 3. Delete existing assignments
      await trx('extra_money_assignments')
        .where({ extra_money_entry_id: extraMoneyId })
        .delete();

      // 4. Create new assignments
      const assignmentRecords = assignments.map(a => ({
        id: uuidv4(),
        extra_money_entry_id: extraMoneyId,
        category_id: a.category_id || null,
        section_id: a.section_id || null,
        amount: a.amount,
        assigned_by_user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      }));

      if (assignmentRecords.length > 0) {
        await trx('extra_money_assignments').insert(assignmentRecords);
      }

      // 5. Update budget allocations for current month (category assignments only)
      const month = new Date();
      const budgetMonth = await BudgetService.getOrCreateBudgetMonth(householdId, month, trx);

      for (const assignment of assignments) {
        if (!assignment.category_id) continue;
        await trx('budget_allocations')
          .where({
            budget_month_id: budgetMonth.id,
            category_id: assignment.category_id
          })
          .increment('assigned_amount', assignment.amount);
      }

      // 6. Mark entry as assigned
      await trx('extra_money_entries')
        .where({ id: extraMoneyId })
        .update({
          status: 'assigned',
          assigned_at: new Date(),
          assigned_by_user_id: userId,
          savings_reserve: reserveAmount,
          updated_at: new Date()
        });

      await AnalyticsService.recordEvent(
        'extra_money_assigned',
        householdId,
        userId,
        {
          entry_id: extraMoneyId,
          amount: Number(entry.amount),
          savings_reserve: reserveAmount,
        },
        trx
      );

      // 7. Return updated entry
      return await trx('extra_money_entries').where({ id: extraMoneyId }).first();
    });
  }

  /**
   * Assign savings reserve to goals
   */
  static async assignSavingsToGoals(
    extraMoneyId: string,
    householdId: string,
    userId: string,
    allocations: Array<{ goal_id: string; amount: number }>
  ): Promise<ExtraMoneyEntry> {
    return await knex.transaction(async (trx) => {
      const entry = await trx('extra_money_entries')
        .where({ id: extraMoneyId, household_id: householdId })
        .first();

      if (!entry) {
        throw new Error('Extra money entry not found');
      }

      const totalAssigned = allocations.reduce((sum, a) => sum + a.amount, 0);
      const currentReserve = Number(entry.savings_reserve || 0);

      if (totalAssigned > currentReserve + 0.01) {
        throw new Error('Assigned goals exceed savings reserve');
      }

      for (const allocation of allocations) {
        const goal = await trx('goals')
          .where({ id: allocation.goal_id, household_id: householdId })
          .first();

        if (!goal) {
          throw new Error('Goal not found or does not belong to this household');
        }

        await trx('goal_contributions').insert({
          goal_id: allocation.goal_id,
          user_id: userId,
          amount: allocation.amount,
          contribution_date: new Date(),
          notes: `Extra money reserve from ${entry.source}`,
          transaction_id: entry.transaction_id || null
        });

        const newCurrentAmount = Number(goal.current_amount) + allocation.amount;
        const isCompleted = newCurrentAmount >= Number(goal.target_amount);

        await trx('goals')
          .where({ id: allocation.goal_id })
          .update({
            current_amount: newCurrentAmount,
            is_completed: isCompleted,
            completed_at: isCompleted ? trx.fn.now() : goal.completed_at,
            updated_at: trx.fn.now()
          });

        await trx('extra_money_goal_allocations').insert({
          id: uuidv4(),
          extra_money_entry_id: extraMoneyId,
          goal_id: allocation.goal_id,
          amount: allocation.amount,
          assigned_by_user_id: userId
        });
      }

      const remainingReserve = Math.max(0, currentReserve - totalAssigned);

      await trx('extra_money_entries')
        .where({ id: extraMoneyId })
        .update({
          savings_reserve: remainingReserve,
          updated_at: new Date()
        });

      await AnalyticsService.recordEvent(
        'extra_money_assigned',
        householdId,
        userId,
        {
          entry_id: extraMoneyId,
          amount: totalAssigned,
          savings_only: true,
        },
        trx
      );

      return await trx('extra_money_entries').where({ id: extraMoneyId }).first();
    });
  }

  /**
   * Ignore extra money entry (user confirms it's not actually extra money)
   */
  static async ignoreEntry(
    extraMoneyId: string,
    householdId: string,
    userId: string
  ): Promise<ExtraMoneyEntry> {
    const updated = await knex('extra_money_entries')
      .where({ id: extraMoneyId, household_id: householdId })
      .update({
        status: 'ignored',
        assigned_by_user_id: userId,
        updated_at: new Date()
      })
      .returning('*')
      .then(rows => rows[0]);

    if (!updated) {
      throw new Error('Extra money entry not found');
    }

    return updated;
  }

  /**
   * Delete extra money entry
   */
  static async deleteEntry(extraMoneyId: string, householdId: string): Promise<void> {
    await knex('extra_money_entries')
      .where({ id: extraMoneyId, household_id: householdId })
      .delete();
  }

  /**
   * Run detection on recent positive transactions (called by user or after transaction creation)
   */
  static async runDetectionScan(householdId: string): Promise<number> {
    // Get positive transactions from last 30 days that aren't already linked
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentIncomeTransactions = await knex('transactions')
      .where({ household_id: householdId })
      .where('amount', '>', 0) // Positive transactions only
      .where('transaction_date', '>=', thirtyDaysAgo)
      .whereNotIn(
        'id',
        knex('extra_money_entries').select('transaction_id').whereNotNull('transaction_id')
      )
      .select('id', 'payee', 'amount', 'transaction_date', 'notes');

    let flaggedCount = 0;

    for (const transaction of recentIncomeTransactions) {
      const { shouldFlag, reason } = await this.detectExtraMoney(householdId, transaction.id);

      if (shouldFlag) {
        await this.createExtraMoneyEntry({
          household_id: householdId,
          transaction_id: transaction.id,
          source: transaction.payee || 'Unknown Source',
          amount: transaction.amount,
          received_date: transaction.transaction_date,
          notes: transaction.notes,
          auto_detected: true,
          detection_reason: reason,
          user_id: householdId // System detection
        });

        flaggedCount++;
      }
    }

    return flaggedCount;
  }

  /**
   * Get household's extra money preferences
   */
  static async getPreferences(householdId: string): Promise<ExtraMoneyPreference | null> {
    const preference = await knex('extra_money_preferences')
      .where({ household_id: householdId })
      .first();

    if (!preference) return null;

    // Parse JSON columns (if they're strings; pg might return them as objects already)
    return {
      ...preference,
      category_percentages: typeof preference.category_percentages === 'string'
        ? JSON.parse(preference.category_percentages)
        : preference.category_percentages,
      section_percentages: typeof preference.section_percentages === 'string'
        ? JSON.parse(preference.section_percentages)
        : preference.section_percentages || {},
      default_categories: typeof preference.default_categories === 'string'
        ? JSON.parse(preference.default_categories)
        : preference.default_categories,
      default_sections: typeof preference.default_sections === 'string'
        ? JSON.parse(preference.default_sections)
        : preference.default_sections || {},
      reserve_percentage: Number(preference.reserve_percentage || 0)
    };
  }

  /**
   * Create or update extra money preferences
   */
  static async savePreferences(
    householdId: string,
    categoryPercentages: Record<string, number>,
    defaultCategories: Record<string, string>,
    sectionPercentages: Record<string, number> = {},
    defaultSections: Record<string, string> = {},
    reservePercentage = 0
  ): Promise<ExtraMoneyPreference> {
    // Validate percentages sum to 1.00 (100%)
    const total = Object.values(categoryPercentages).reduce((sum, p) => sum + p, 0)
      + Object.values(sectionPercentages).reduce((sum, p) => sum + p, 0)
      + Number(reservePercentage || 0);
    if (Math.abs(total - 1.00) > 0.0001) {
      throw new Error('Percentages must sum to 100%');
    }

    const { normalized } = await this.normalizePreferences(householdId, {
      category_percentages: categoryPercentages,
      section_percentages: sectionPercentages,
      default_categories: defaultCategories,
      default_sections: defaultSections,
      reserve_percentage: reservePercentage
    });

    // Check if preferences exist
    const existing = await knex('extra_money_preferences')
      .where({ household_id: householdId })
      .first();

    if (existing) {
      // Update
      const updated = await knex('extra_money_preferences')
        .where({ household_id: householdId })
        .update({
          category_percentages: JSON.stringify(normalized.category_percentages),
          section_percentages: JSON.stringify(normalized.section_percentages),
          default_categories: JSON.stringify(normalized.default_categories),
          default_sections: JSON.stringify(normalized.default_sections),
          reserve_percentage: normalized.reserve_percentage,
          updated_at: new Date()
        })
        .returning('*')
        .then(rows => rows[0]);

      return {
        ...updated,
        category_percentages: typeof updated.category_percentages === 'string'
          ? JSON.parse(updated.category_percentages)
          : updated.category_percentages,
        section_percentages: typeof updated.section_percentages === 'string'
          ? JSON.parse(updated.section_percentages)
          : updated.section_percentages || {},
        default_categories: typeof updated.default_categories === 'string'
          ? JSON.parse(updated.default_categories)
          : updated.default_categories,
        default_sections: typeof updated.default_sections === 'string'
          ? JSON.parse(updated.default_sections)
          : updated.default_sections || {},
        reserve_percentage: Number(updated.reserve_percentage || 0)
      };
    } else {
      // Insert
      const inserted = await knex('extra_money_preferences')
        .insert({
          id: uuidv4(),
          household_id: householdId,
          category_percentages: JSON.stringify(normalized.category_percentages),
          section_percentages: JSON.stringify(normalized.section_percentages),
          default_categories: JSON.stringify(normalized.default_categories),
          default_sections: JSON.stringify(normalized.default_sections),
          reserve_percentage: normalized.reserve_percentage,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*')
        .then(rows => rows[0]);

      return {
        ...inserted,
        category_percentages: typeof inserted.category_percentages === 'string'
          ? JSON.parse(inserted.category_percentages)
          : inserted.category_percentages,
        section_percentages: typeof inserted.section_percentages === 'string'
          ? JSON.parse(inserted.section_percentages)
          : inserted.section_percentages || {},
        default_categories: typeof inserted.default_categories === 'string'
          ? JSON.parse(inserted.default_categories)
          : inserted.default_categories,
        default_sections: typeof inserted.default_sections === 'string'
          ? JSON.parse(inserted.default_sections)
          : inserted.default_sections || {},
        reserve_percentage: Number(inserted.reserve_percentage || 0)
      };
    }
  }

  /**
   * Calculate recommended assignments based on user percentages
   */
  static async calculateRecommendations(
    householdId: string,
    amount: number
  ): Promise<RecommendedAssignment[]> {
    const preferences = await this.getPreferences(householdId);

    if (!preferences) {
      return []; // No preferences set yet
    }

    const { normalized, changed } = await this.normalizePreferences(householdId, preferences);
    if (changed) {
      await knex('extra_money_preferences')
        .where({ household_id: householdId })
        .update({
          category_percentages: JSON.stringify(normalized.category_percentages),
          section_percentages: JSON.stringify(normalized.section_percentages),
          default_categories: JSON.stringify(normalized.default_categories),
          default_sections: JSON.stringify(normalized.default_sections),
          reserve_percentage: normalized.reserve_percentage,
          updated_at: new Date()
        });
    }

    const effectivePreferences = changed ? normalized : preferences;

    const recommendations: RecommendedAssignment[] = [];

    // Get category names
    const categoryIds = Object.keys(effectivePreferences.category_percentages || {});
    const categories = await knex('categories')
      .whereIn('id', categoryIds)
      .where({ household_id: householdId })
      .select('id', 'name');

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    for (const [categoryId, percentage] of Object.entries(effectivePreferences.category_percentages || {})) {
      if (percentage > 0) {
        const assignedAmount = Math.round(amount * percentage * 100) / 100;

        recommendations.push({
          category_id: categoryId,
          category_name: categoryMap.get(categoryId) || 'Unknown',
          amount: assignedAmount,
          percentage: percentage * 100, // Convert to percentage for display
          type: 'category'
        });
      }
    }

    const sectionIds = Object.keys(effectivePreferences.section_percentages || {});
    if (sectionIds.length > 0) {
      const sections = await knex('category_sections')
        .whereIn('id', sectionIds)
        .where({ household_id: householdId })
        .select('id', 'name');

      const sectionMap = new Map(sections.map(s => [s.id, s.name]));

      for (const [sectionId, percentage] of Object.entries(effectivePreferences.section_percentages || {})) {
        if (percentage > 0) {
          const assignedAmount = Math.round(amount * percentage * 100) / 100;
          recommendations.push({
            section_id: sectionId,
            section_name: sectionMap.get(sectionId) || 'Unknown',
            amount: assignedAmount,
            percentage: percentage * 100,
            type: 'section'
          });
        }
      }
    }

    const reservePercentage = Number(effectivePreferences.reserve_percentage || 0);
    if (reservePercentage > 0) {
      const reservedAmount = Math.round(amount * reservePercentage * 100) / 100;
      recommendations.push({
        amount: reservedAmount,
        percentage: reservePercentage * 100,
        type: 'reserve'
      });
    }

    return recommendations;
  }

  private static async ensureGivingCategories(householdId: string): Promise<{
    flexibleSectionId: string;
    givingCategoryId: string;
    donationsCategoryId: string;
    helpingCategoryId: string;
  }> {
    let flexibleSection = await knex('category_sections')
      .where({ household_id: householdId, type: 'flexible', name: 'Flexible Spending' })
      .first();

    if (!flexibleSection) {
      flexibleSection = await knex('category_sections')
        .where({ household_id: householdId, type: 'flexible' })
        .whereNot({ name: 'Income' })
        .orderBy('sort_order', 'asc')
        .first();
    }

    if (!flexibleSection) {
      flexibleSection = await CategoryService.createSection(householdId, {
        name: 'Flexible Spending',
        type: 'flexible',
        sort_order: 0
      });
    }

    let givingCategory = await knex('categories')
      .where({
        household_id: householdId,
        section_id: flexibleSection.id,
        name: 'Giving',
        parent_category_id: null
      })
      .first();

    if (!givingCategory) {
      givingCategory = await CategoryService.createCategory(householdId, {
        section_id: flexibleSection.id,
        name: 'Giving'
      });
    }

    let donationsCategory = await knex('categories')
      .where({
        household_id: householdId,
        section_id: flexibleSection.id,
        name: 'Donations',
        parent_category_id: givingCategory.id
      })
      .first();

    if (!donationsCategory) {
      donationsCategory = await CategoryService.createCategory(householdId, {
        section_id: flexibleSection.id,
        name: 'Donations',
        parent_category_id: givingCategory.id
      });
    }

    let helpingCategory = await knex('categories')
      .where({
        household_id: householdId,
        section_id: flexibleSection.id,
        name: 'Helping Friends/Family',
        parent_category_id: givingCategory.id
      })
      .first();

    if (!helpingCategory) {
      helpingCategory = await CategoryService.createCategory(householdId, {
        section_id: flexibleSection.id,
        name: 'Helping Friends/Family',
        parent_category_id: givingCategory.id
      });
    }

    return {
      flexibleSectionId: flexibleSection.id,
      givingCategoryId: givingCategory.id,
      donationsCategoryId: donationsCategory.id,
      helpingCategoryId: helpingCategory.id
    };
  }
}
