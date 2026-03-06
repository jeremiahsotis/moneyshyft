import { Router, Request, Response } from 'express';
import { DebtService } from '../../../services/DebtService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createDebtSchema,
  updateDebtSchema,
  addDebtPaymentSchema,
  calculatePayoffSchema,
} from '../../../validators/debt.validators';

const router = Router();
router.use(authenticateToken);
router.use(requireHouseholdAccess);

/**
 * GET /api/v1/debts
 * Get all debts for household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  const debts = await DebtService.getAllDebts(householdId);
  const totalDebt = await DebtService.getTotalDebt(householdId);
  const totalMinimumPayments = await DebtService.getTotalMinimumPayments(householdId);

  res.json({
    success: true,
    data: {
      debts,
      total_debt: totalDebt,
      total_minimum_payments: totalMinimumPayments,
    },
  });
}));

/**
 * POST /api/v1/debts/calculate-payoff
 * Calculate snowball vs avalanche payoff strategies
 */
router.post('/calculate-payoff', validateRequest(calculatePayoffSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  const { monthly_payment_budget } = req.body;
  const comparison = await DebtService.calculatePayoffStrategies(householdId, monthly_payment_budget);

  res.json({
    success: true,
    data: comparison,
  });
}));

/**
 * POST /api/v1/debts/commit-plan
 * Commit a debt payoff plan to budget
 */
router.post('/commit-plan', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const userId = req.user!.userId;

  const { method, total_monthly_payment, debts } = req.body;

  // Validation
  if (!method || !['snowball', 'avalanche'].includes(method)) {
    return res.status(400).json({ error: 'Invalid method. Must be snowball or avalanche' });
  }

  if (!total_monthly_payment || total_monthly_payment <= 0) {
    return res.status(400).json({ error: 'Total monthly payment must be greater than 0' });
  }

  if (!debts || !Array.isArray(debts) || debts.length === 0) {
    return res.status(400).json({ error: 'Debts array is required' });
  }

  await DebtService.commitPaymentPlan(householdId, userId, {
    method,
    total_monthly_payment,
    debts,
  });

  res.json({
    success: true,
    message: 'Payment plan committed successfully',
  });
}));

/**
 * GET /api/v1/debts/active-plan
 * Get the active payment plan
 */
router.get('/active-plan', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  const plan = await DebtService.getActivePaymentPlan(householdId);

  res.json({
    success: true,
    data: plan,
  });
}));

/**
 * GET /api/v1/debts/:id
 * Get a single debt by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  const debt = await DebtService.getDebtById(id, householdId);

  res.json({
    success: true,
    data: debt,
  });
}));

/**
 * POST /api/v1/debts
 * Create a new debt
 */
router.post('/', validateRequest(createDebtSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  const debt = await DebtService.createDebt(householdId, req.body);

  res.status(201).json({
    success: true,
    data: debt,
  });
}));

/**
 * PATCH /api/v1/debts/:id
 * Update a debt
 */
router.patch('/:id', validateRequest(updateDebtSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  const debt = await DebtService.updateDebt(id, householdId, req.body);

  res.json({
    success: true,
    data: debt,
  });
}));

/**
 * DELETE /api/v1/debts/:id
 * Delete a debt
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  await DebtService.deleteDebt(id, householdId);

  res.json({
    success: true,
    message: 'Debt deleted successfully',
  });
}));

/**
 * POST /api/v1/debts/:id/payments
 * Add a payment to a debt
 */
router.post('/:id/payments', validateRequest(addDebtPaymentSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;
  const userId = req.user!.userId;

  const debt = await DebtService.addPayment(id, householdId, userId, req.body);

  res.json({
    success: true,
    data: debt,
    message: debt.is_paid_off ? 'Congratulations! Debt paid off!' : 'Payment added successfully',
  });
}));

/**
 * GET /api/v1/debts/:id/payments
 * Get payment history for a debt
 */
router.get('/:id/payments', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  const payments = await DebtService.getPayments(id, householdId);

  res.json({
    success: true,
    data: payments,
  });
}));

export default router;
