import { Router, Request, Response } from 'express';
import { IncomeService } from '../../../services/IncomeService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createIncomeSourceSchema,
  updateIncomeSourceSchema
} from '../../../validators/income.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/income
 * Get all income sources for household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const sources = await IncomeService.getAllIncomeSources(householdId);
  const total = await IncomeService.getTotalMonthlyIncome(householdId);

  res.json({
    success: true,
    data: {
      sources,
      total_monthly_income: total
    }
  });
}));

/**
 * POST /api/v1/income
 * Create a new income source
 */
router.post('/', validateRequest(createIncomeSourceSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const source = await IncomeService.createIncomeSource(householdId, req.body);

  res.status(201).json({
    success: true,
    data: source
  });
}));

/**
 * PATCH /api/v1/income/:id
 * Update an income source
 */
router.patch('/:id', validateRequest(updateIncomeSourceSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const source = await IncomeService.updateIncomeSource(id, householdId, req.body);

  res.json({
    success: true,
    data: source
  });
}));

/**
 * DELETE /api/v1/income/:id
 * Delete an income source
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  await IncomeService.deleteIncomeSource(id, householdId);

  res.json({
    success: true,
    message: 'Income source deleted successfully'
  });
}));

export default router;
