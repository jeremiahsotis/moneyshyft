import { Router, Request, Response } from 'express';
import { BudgetService } from '../../../services/BudgetService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createBudgetMonthSchema,
  updateBudgetMonthSchema,
  setBudgetAllocationSchema,
  bulkSetAllocationsSchema,
  assignAccountBalanceSchema
} from '../../../validators/budget.validators';

const router = Router();

// All routes require authentication and household access
router.use(authenticateToken);
router.use(requireHouseholdAccess);

/**
 * GET /api/v1/budgets/:month/summary
 * Get budget summary for a specific month (allocated vs spent)
 * Month format: YYYY-MM-DD (first day of month) or YYYY-MM
 */
router.get('/:month/summary', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { month } = req.params;

  // Parse month parameter
  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM-DD or YYYY-MM' });
  }

  const summary = await BudgetService.getBudgetSummary(householdId, monthDate);

  res.json({
    success: true,
    data: summary
  });
}));

/**
 * PUT /api/v1/budgets/:month/notes
 * Update budget month notes
 */
router.put('/:month/notes', validateRequest(updateBudgetMonthSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { month } = req.params;
  const { notes } = req.body;

  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM-DD or YYYY-MM' });
  }

  const budgetMonth = await BudgetService.updateBudgetMonth(householdId, monthDate, notes);

  res.json({
    success: true,
    data: budgetMonth
  });
}));

/**
 * GET /api/v1/budgets/:month/allocations
 * Get all allocations for a specific month
 */
router.get('/:month/allocations', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { month } = req.params;

  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM-DD or YYYY-MM' });
  }

  const allocations = await BudgetService.getAllocations(householdId, monthDate);

  res.json({
    success: true,
    data: allocations
  });
}));

/**
 * POST /api/v1/budgets/:month/allocations
 * Set a single budget allocation (category or section level)
 */
router.post('/:month/allocations', validateRequest(setBudgetAllocationSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { month } = req.params;
  const allocationData = req.body;

  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM-DD or YYYY-MM' });
  }

  const allocation = await BudgetService.setAllocation(householdId, monthDate, allocationData);

  res.status(201).json({
    success: true,
    data: allocation
  });
}));

/**
 * POST /api/v1/budgets/:month/allocations/bulk
 * Bulk set multiple allocations at once
 */
router.post('/:month/allocations/bulk', validateRequest(bulkSetAllocationsSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { month } = req.params;
  const { allocations } = req.body;

  const monthDate = new Date(month);
  if (isNaN(monthDate.getTime())) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM-DD or YYYY-MM' });
  }

  const results = await BudgetService.bulkSetAllocations(householdId, monthDate, allocations);

  res.status(201).json({
    success: true,
    data: results,
    message: `${results.length} allocation(s) created/updated`
  });
}));

/**
 * DELETE /api/v1/budgets/allocations/:id
 * Delete a specific allocation
 */
router.delete('/allocations/:id', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const { id } = req.params;

  await BudgetService.deleteAllocation(householdId, id);

  res.json({
    success: true,
    message: 'Allocation deleted successfully'
  });
}));

/**
 * POST /api/v1/budgets/assign-account-balance
 * Assign account balance to a category
 * Used during wizard setup when users assign their existing account balances
 * This creates an account_balance_assignment record and updates the category's assigned_amount
 */
router.post('/assign-account-balance', validateRequest(assignAccountBalanceSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const userId = req.user!.userId!;
  const { category_id, section_id, account_id, amount, month } = req.body;

  const allocation = await BudgetService.assignAccountBalance(
    householdId,
    userId,
    {
      category_id,
      section_id,
      account_id,
      amount,
      month
    }
  );

  res.status(201).json({
    success: true,
    data: allocation,
    message: `Assigned ${amount} to ${category_id ? 'category' : 'section'}`
  });
}));

export default router;
