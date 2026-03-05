import { Router, Request, Response } from 'express';
import { GoalService } from '../../../services/GoalService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken, requireHouseholdAccess } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { createGoalSchema, updateGoalSchema, addContributionSchema } from '../../../validators/goal.validators';

const router = Router();

// All routes require authentication and household access
router.use(authenticateToken);
router.use(requireHouseholdAccess);

/**
 * GET /api/v1/goals
 * Get all goals for the authenticated user's household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;

  const goals = await GoalService.getAllGoals(householdId);

  res.json({
    success: true,
    data: goals
  });
}));

/**
 * GET /api/v1/goals/:id
 * Get a specific goal by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  const goal = await GoalService.getGoalById(id, householdId);

  res.json({
    success: true,
    data: goal
  });
}));

/**
 * POST /api/v1/goals
 * Create a new goal
 */
router.post('/', validateRequest(createGoalSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId!;
  const goalData = req.body;

  const goal = await GoalService.createGoal(householdId, goalData);

  res.status(201).json({
    success: true,
    data: goal
  });
}));

/**
 * PATCH /api/v1/goals/:id
 * Update a goal
 */
router.patch('/:id', validateRequest(updateGoalSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;
  const updateData = req.body;

  const goal = await GoalService.updateGoal(id, householdId, updateData);

  res.json({
    success: true,
    data: goal
  });
}));

/**
 * DELETE /api/v1/goals/:id
 * Delete a goal
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  await GoalService.deleteGoal(id, householdId);

  res.json({
    success: true,
    message: 'Goal deleted successfully'
  });
}));

/**
 * POST /api/v1/goals/:id/contributions
 * Add a contribution to a goal
 */
router.post('/:id/contributions', validateRequest(addContributionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;
  const userId = req.user!.userId;
  const contributionData = req.body;

  const goal = await GoalService.addContribution(id, householdId, userId, contributionData);

  res.status(201).json({
    success: true,
    data: goal
  });
}));

/**
 * GET /api/v1/goals/:id/contributions
 * Get all contributions for a goal
 */
router.get('/:id/contributions', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId!;

  const contributions = await GoalService.getGoalContributions(id, householdId);

  res.json({
    success: true,
    data: contributions
  });
}));

export default router;
