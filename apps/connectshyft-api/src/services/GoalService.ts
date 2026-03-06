import knex from '../config/knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface Goal {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: Date | null;
  category_id: string | null;
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface GoalWithProgress extends Goal {
  progress_percentage: number;
  monthly_contribution_needed: number | null;
}

export class GoalService {
  /**
   * Get all goals for a household with progress calculations
   */
  static async getAllGoals(householdId: string): Promise<GoalWithProgress[]> {
    const goals = await knex('goals')
      .where({ household_id: householdId })
      .orderBy('created_at', 'desc');

    return goals.map(goal => this.calculateProgress(goal));
  }

  /**
   * Get a single goal by ID with progress
   */
  static async getGoalById(goalId: string, householdId: string): Promise<GoalWithProgress> {
    const goal = await knex('goals')
      .where({ id: goalId, household_id: householdId })
      .first();

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    return this.calculateProgress(goal);
  }

  /**
   * Create a new goal
   */
  static async createGoal(
    householdId: string,
    data: {
      name: string;
      description?: string | null;
      target_amount: number;
      current_amount?: number;
      target_date?: Date | null;
      category_id?: string | null;
    }
  ): Promise<GoalWithProgress> {
    const { name, description, target_amount, current_amount = 0, target_date, category_id } = data;

    // If category provided, verify it belongs to household
    if (category_id) {
      const category = await knex('categories')
        .where({ id: category_id, household_id: householdId })
        .first();

      if (!category) {
        throw new BadRequestError('Category not found or does not belong to this household');
      }
    }

    const [goal] = await knex('goals')
      .insert({
        household_id: householdId,
        name,
        description: description || null,
        target_amount,
        current_amount,
        target_date: target_date || null,
        category_id: category_id || null,
        is_completed: current_amount >= target_amount
      })
      .returning('*');

    logger.info(`Goal created: ${goal.id} for household: ${householdId}`);

    return this.calculateProgress(goal);
  }

  /**
   * Update a goal
   */
  static async updateGoal(
    goalId: string,
    householdId: string,
    data: {
      name?: string;
      description?: string | null;
      target_amount?: number;
      current_amount?: number;
      target_date?: Date | null;
      category_id?: string | null;
      is_completed?: boolean;
    }
  ): Promise<GoalWithProgress> {
    // Check if goal exists
    await this.getGoalById(goalId, householdId);

    // If category is being updated, verify it belongs to household
    if (data.category_id !== undefined && data.category_id !== null) {
      const category = await knex('categories')
        .where({ id: data.category_id, household_id: householdId })
        .first();

      if (!category) {
        throw new BadRequestError('Category not found or does not belong to this household');
      }
    }

    // Check if goal is being marked as completed
    const updateData: any = { ...data, updated_at: knex.fn.now() };

    if (data.is_completed === true) {
      updateData.completed_at = knex.fn.now();
    } else if (data.is_completed === false) {
      updateData.completed_at = null;
    }

    const [updatedGoal] = await knex('goals')
      .where({ id: goalId, household_id: householdId })
      .update(updateData)
      .returning('*');

    logger.info(`Goal updated: ${goalId}`);

    return this.calculateProgress(updatedGoal);
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string, householdId: string): Promise<void> {
    // Check if goal exists
    await this.getGoalById(goalId, householdId);

    // Delete all contributions first
    await knex('goal_contributions')
      .where({ goal_id: goalId })
      .del();

    // Delete goal
    await knex('goals')
      .where({ id: goalId, household_id: householdId })
      .del();

    logger.info(`Goal deleted: ${goalId}`);
  }

  /**
   * Add a contribution to a goal
   */
  static async addContribution(
    goalId: string,
    householdId: string,
    userId: string,
    data: {
      amount: number;
      contribution_date?: Date;
      notes?: string | null;
      transaction_id?: string | null;
    }
  ): Promise<GoalWithProgress> {
    const goal = await this.getGoalById(goalId, householdId);

    const { amount, contribution_date = new Date(), notes, transaction_id } = data;

    // If transaction_id provided, verify it belongs to household
    if (transaction_id) {
      const transaction = await knex('transactions')
        .where({ id: transaction_id, household_id: householdId })
        .first();

      if (!transaction) {
        throw new BadRequestError('Transaction not found or does not belong to this household');
      }
    }

    // Add contribution
    await knex('goal_contributions')
      .insert({
        goal_id: goalId,
        user_id: userId,
        amount,
        contribution_date,
        notes: notes || null,
        transaction_id: transaction_id || null
      });

    // Update goal current amount
    const newCurrentAmount = Number(goal.current_amount) + amount;
    const isCompleted = newCurrentAmount >= Number(goal.target_amount);

    const [updatedGoal] = await knex('goals')
      .where({ id: goalId })
      .update({
        current_amount: newCurrentAmount,
        is_completed: isCompleted,
        completed_at: isCompleted ? knex.fn.now() : goal.completed_at,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Contribution added to goal: ${goalId}, amount: ${amount}`);

    return this.calculateProgress(updatedGoal);
  }

  /**
   * Get contributions for a goal with transaction details
   */
  static async getGoalContributions(goalId: string, householdId: string) {
    // Verify goal belongs to household
    await this.getGoalById(goalId, householdId);

    const contributions = await knex('goal_contributions as gc')
      .leftJoin('transactions as t', 'gc.transaction_id', 't.id')
      .leftJoin('users as u', 'gc.user_id', 'u.id')
      .where({ 'gc.goal_id': goalId })
      .select(
        'gc.*',
        'u.name as user_name',
        't.description as transaction_description',
        't.transaction_date as transaction_date'
      )
      .orderBy('gc.contribution_date', 'desc');

    return contributions;
  }

  /**
   * Calculate progress percentage and monthly contribution needed
   */
  private static calculateProgress(goal: Goal): GoalWithProgress {
    const current = Number(goal.current_amount);
    const target = Number(goal.target_amount);
    const progressPercentage = Math.min(Math.round((current / target) * 100), 100);

    let monthlyContributionNeeded: number | null = null;

    if (goal.target_date && !goal.is_completed) {
      const today = new Date();
      const targetDate = new Date(goal.target_date);
      const monthsRemaining = Math.max(
        (targetDate.getFullYear() - today.getFullYear()) * 12 +
        (targetDate.getMonth() - today.getMonth()),
        1 // At least 1 month
      );

      const remaining = target - current;
      monthlyContributionNeeded = Math.ceil(remaining / monthsRemaining * 100) / 100;
    }

    return {
      ...goal,
      progress_percentage: progressPercentage,
      monthly_contribution_needed: monthlyContributionNeeded
    };
  }
}
