import knex from '../config/knex';
import { NotFoundError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface IncomeSource {
  id: string;
  household_id: string;
  name: string;
  monthly_amount: number;
  frequency: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually' | null;
  expected_day_of_month: number | null;
  hours_per_week: number | null;
  last_payment_date: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateIncomeSourceData {
  name: string;
  monthly_amount: number;
  frequency?: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually';
  expected_day_of_month?: number | null;
  hours_per_week?: number | null;
  last_payment_date?: string | null;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateIncomeSourceData {
  name?: string;
  monthly_amount?: number;
  frequency?: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually' | null;
  expected_day_of_month?: number | null;
  hours_per_week?: number | null;
  last_payment_date?: string | null;
  is_active?: boolean;
  sort_order?: number;
  notes?: string;
}

export class IncomeService {
  /**
   * Get all income sources for a household
   */
  static async getAllIncomeSources(householdId: string): Promise<IncomeSource[]> {
    const sources = await knex('income_sources')
      .where({ household_id: householdId })
      .orderBy('sort_order', 'asc')
      .select('*');

    return sources;
  }

  /**
   * Get total monthly income for a household
   */
  static async getTotalMonthlyIncome(householdId: string): Promise<number> {
    const result = await knex('income_sources')
      .where({ household_id: householdId, is_active: true })
      .sum('monthly_amount as total')
      .first();

    return Number(result?.total || 0);
  }

  /**
   * Create a new income source
   */
  static async createIncomeSource(
    householdId: string,
    data: CreateIncomeSourceData
  ): Promise<IncomeSource> {
    // Get next sort order
    const maxOrderResult = await knex('income_sources')
      .where({ household_id: householdId })
      .max('sort_order as max_order')
      .first();

    const nextOrder = (Number(maxOrderResult?.max_order) || 0) + 1;

    const [source] = await knex('income_sources')
      .insert({
        household_id: householdId,
        name: data.name,
        monthly_amount: data.monthly_amount,
        frequency: data.frequency || null,
        expected_day_of_month: data.expected_day_of_month ?? null,
        hours_per_week: data.hours_per_week ?? null,
        last_payment_date: data.last_payment_date ?? null,
        is_active: data.is_active ?? true,
        sort_order: nextOrder,
        notes: data.notes || null,
      })
      .returning('*');

    logger.info(`Income source created: ${source.id} for household ${householdId}`);
    return source;
  }

  /**
   * Update an income source
   */
  static async updateIncomeSource(
    sourceId: string,
    householdId: string,
    data: UpdateIncomeSourceData
  ): Promise<IncomeSource> {
    const [updated] = await knex('income_sources')
      .where({ id: sourceId, household_id: householdId })
      .update({
        ...data,
        updated_at: knex.fn.now(),
      })
      .returning('*');

    if (!updated) {
      throw new NotFoundError('Income source not found');
    }

    logger.info(`Income source updated: ${sourceId}`);
    return updated;
  }

  /**
   * Delete an income source
   */
  static async deleteIncomeSource(sourceId: string, householdId: string): Promise<void> {
    const deleted = await knex('income_sources')
      .where({ id: sourceId, household_id: householdId })
      .delete();

    if (deleted === 0) {
      throw new NotFoundError('Income source not found');
    }

    logger.info(`Income source deleted: ${sourceId}`);
  }

  /**
   * Convert income from any frequency to monthly amount
   * @param amount - The income amount
   * @param frequency - Payment frequency (hourly, weekly, biweekly, semimonthly, monthly, annually)
   * @param hoursPerWeek - Required for hourly frequency
   * @returns Monthly income amount
   */
  static convertToMonthly(
    amount: number,
    frequency: 'hourly' | 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually',
    hoursPerWeek?: number
  ): number {
    switch (frequency) {
      case 'hourly':
        if (!hoursPerWeek || hoursPerWeek <= 0) {
          throw new Error('Hours per week required for hourly rate');
        }
        // hourly rate × hours/week × 52 weeks / 12 months
        return Number((amount * hoursPerWeek * 52 / 12).toFixed(2));

      case 'weekly':
        // weekly × 52 weeks / 12 months
        return Number((amount * 52 / 12).toFixed(2));

      case 'biweekly':
        // biweekly × 26 pay periods / 12 months
        return Number((amount * 26 / 12).toFixed(2));

      case 'semimonthly':
        // semimonthly × 2 (twice per month)
        return Number((amount * 2).toFixed(2));

      case 'monthly':
        return Number(amount.toFixed(2));

      case 'annually':
        // annually / 12 months
        return Number((amount / 12).toFixed(2));

      default:
        throw new Error(`Unknown frequency: ${frequency}`);
    }
  }
}
