import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import db from '../../../config/knex';
import logger from '../../../utils/logger';
import { AnalyticsService } from '../../../services/AnalyticsService';

const router = Router();

// All routes require authentication and household access
router.use(authenticateToken);
router.use(requireHouseholdAccess);

/**
 * GET /api/v1/households/current
 * Get current user's household information
 */
router.get('/current', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  // Get household information
  const household = await db('households')
    .where({ id: householdId })
    .first();

  if (!household) {
    return res.status(404).json({ error: 'Household not found' });
  }

  // Count household members
  const memberCount = await db('users')
    .where({ household_id: householdId })
    .count('* as count')
    .first();

  res.json({
    success: true,
    id: household.id,
    name: household.name,
    invitation_code: household.invitation_code,
    member_count: parseInt(memberCount?.count as string || '0'),
    setup_wizard_completed: household.setup_wizard_completed,
    setup_wizard_completed_at: household.setup_wizard_completed_at,
    created_at: household.created_at
  });
}));

/**
 * PATCH /api/v1/households/setup-wizard
 * Mark setup wizard as completed for the current household
 */
router.patch('/setup-wizard', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const userId = req.user!.userId;

  await db('households')
    .where({ id: householdId })
    .update({
      setup_wizard_completed: true,
      setup_wizard_completed_at: db.fn.now()
    });

  await AnalyticsService.recordEvent(
    'setup_wizard_completed',
    householdId,
    userId,
    {}
  );

  res.json({
    success: true,
    message: 'Setup wizard marked as completed'
  });
}));

/**
 * POST /api/v1/households/reset
 * Reset all household data except users (admin only)
 */
router.post('/reset', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { confirm, resetToken } = req.body ?? {};
  const headerToken = req.header('x-reset-token');
  const expectedToken = process.env.RESET_TOKEN;

  if (!expectedToken || (resetToken !== expectedToken && headerToken !== expectedToken)) {
    return res.status(403).json({ error: 'Invalid reset token.' });
  }

  if (confirm !== 'RESET') {
    return res.status(400).json({ error: 'Confirmation required. Send { confirm: \"RESET\" }.' });
  }

  await db.transaction(async (trx) => {
    const goalsQuery = trx('goals').select('id').where({ household_id: householdId });
    const debtPlansQuery = trx('debt_payment_plans').select('id').where({ household_id: householdId });
    const debtsQuery = trx('debts').select('id').where({ household_id: householdId });
    const budgetMonthsQuery = trx('budget_months').select('id').where({ household_id: householdId });
    const extraMoneyEntriesQuery = trx('extra_money_entries').select('id').where({ household_id: householdId });

    await trx('extra_money_goal_allocations')
      .whereIn('extra_money_entry_id', extraMoneyEntriesQuery)
      .del();
    await trx('extra_money_assignments')
      .whereIn('extra_money_entry_id', extraMoneyEntriesQuery)
      .del();
    await trx('extra_money_entries').where({ household_id: householdId }).del();
    await trx('extra_money_preferences').where({ household_id: householdId }).del();

    await trx('account_balance_assignments').where({ household_id: householdId }).del();
    await trx('assignment_transfers').where({ household_id: householdId }).del();
    await trx('income_assignments').where({ household_id: householdId }).del();
    await trx('income_sources').where({ household_id: householdId }).del();

    await trx('recurring_transaction_instances').where({ household_id: householdId }).del();
    await trx('recurring_transactions').where({ household_id: householdId }).del();
    await trx('user_preferences').where({ household_id: householdId }).del();

    await trx('debt_payment_schedule').whereIn('plan_id', debtPlansQuery).del();
    await trx('debt_payment_plans').where({ household_id: householdId }).del();
    await trx('debt_payments').whereIn('debt_id', debtsQuery).del();
    await trx('debts').where({ household_id: householdId }).del();

    await trx('goal_contributions').whereIn('goal_id', goalsQuery).del();
    await trx('goals').where({ household_id: householdId }).del();

    await trx('budget_allocations').whereIn('budget_month_id', budgetMonthsQuery).del();
    await trx('budget_months').where({ household_id: householdId }).del();

    await trx('transaction_tags').whereIn('transaction_id', trx('transactions').select('id').where({ household_id: householdId })).del();
    await trx('transactions').where({ household_id: householdId }).del();
    await trx('tags').where({ household_id: householdId }).del();
    await trx('categories').where({ household_id: householdId }).del();
    await trx('category_sections').where({ household_id: householdId }).del();
    await trx('accounts').where({ household_id: householdId }).del();

    await trx('household_invitations').where({ household_id: householdId }).del();
    await trx('household_settings').where({ household_id: householdId }).del();
    await trx('analytics_events').where({ household_id: householdId }).del();

    await trx('households')
      .where({ id: householdId })
      .update({
        setup_wizard_completed: false,
        setup_wizard_completed_at: null,
      });
  });

  logger.info('Household reset completed', { householdId, userId: req.user!.userId });

  res.json({
    success: true,
    message: 'Household data reset',
    householdId,
  });
}));

/**
 * GET /api/v1/households/members
 * Get all members of the current user's household
 */
router.get('/members', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  // Get all household members
  const members = await db('users')
    .where({ household_id: householdId })
    .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at')
    .orderBy('created_at', 'asc');

  res.json({
    success: true,
    data: members.map(member => ({
      id: member.id,
      email: member.email,
      firstName: member.first_name,
      lastName: member.last_name,
      fullName: `${member.first_name} ${member.last_name}`,
      role: member.role,
      joinedAt: member.created_at
    }))
  });
}));

export default router;
