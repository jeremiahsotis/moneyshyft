import { Router, Request, Response } from 'express';
import { AssignmentService } from '../../../services/AssignmentService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createAssignmentSchema,
  autoAssignSchema,
  assignToCategoriesSchema,
  autoAssignAllSchema
} from '../../../validators/assignment.validators';
import knex from '../../../config/knex';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/assignments/:month
 * Get all assignments for a month
 */
router.get('/:month', asyncHandler(async (req: Request, res: Response) => {
  const { month } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const assignments = await AssignmentService.getAssignments(householdId, month);
  const toBeAssigned = await AssignmentService.getToBeAssigned(householdId, month);

  res.json({
    success: true,
    data: {
      month,
      assignments,
      to_be_assigned: toBeAssigned
    }
  });
}));

/**
 * POST /api/v1/assignments
 * Create a new assignment (manual)
 */
router.post('/', validateRequest(createAssignmentSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const assignment = await AssignmentService.createAssignment(householdId, userId, req.body);

  res.status(201).json({
    success: true,
    data: assignment
  });
}));

/**
 * POST /api/v1/assignments/auto
 * Auto-assign income to underfunded categories
 */
router.post('/auto', validateRequest(autoAssignSchema), asyncHandler(async (req: Request, res: Response) => {
  const { income_transaction_id } = req.body;
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const result = await AssignmentService.autoAssignIncome(
    householdId,
    income_transaction_id,
    userId
  );

  res.json({
    success: true,
    data: result
  });
}));

/**
 * DELETE /api/v1/assignments/:id
 * Delete an assignment (unassign)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  await AssignmentService.deleteAssignment(id, householdId);

  res.json({
    success: true,
    message: 'Assignment deleted successfully'
  });
}));

/**
 * GET /api/v1/assignments/transaction/:transactionId
 * Get assignments for a specific income transaction
 */
router.get('/transaction/:transactionId', asyncHandler(async (req: Request, res: Response) => {
  const { transactionId } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  // Verify transaction belongs to household
  const transaction = await knex('transactions')
    .where({ id: transactionId, household_id: householdId })
    .first();

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const assignments = await AssignmentService.getAssignmentsForTransaction(transactionId);

  res.json({
    success: true,
    data: assignments
  });
}));

/**
 * POST /api/v1/assignments/transfer
 * Transfer money between categories
 */
router.post('/transfer', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const { from_category_id, from_section_id, to_category_id, to_section_id, amount, month, notes } = req.body;

  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  if (!month) {
    return res.status(400).json({ error: 'Month is required (YYYY-MM format)' });
  }

  if (!from_category_id && !from_section_id) {
    return res.status(400).json({ error: 'Source category or section is required' });
  }

  if (!to_category_id && !to_section_id) {
    return res.status(400).json({ error: 'Destination category or section is required' });
  }

  // Prevent transferring to the same category/section
  if (from_category_id && from_category_id === to_category_id) {
    return res.status(400).json({ error: 'Cannot transfer to the same category' });
  }

  if (from_section_id && from_section_id === to_section_id) {
    return res.status(400).json({ error: 'Cannot transfer to the same section' });
  }

  await AssignmentService.transferMoney(householdId, userId, {
    from_category_id,
    from_section_id,
    to_category_id,
    to_section_id,
    amount: Number(amount),
    month,
    notes,
  });

  res.json({
    success: true,
    message: 'Money transferred successfully'
  });
}));

/**
 * POST /api/v1/assignments/assign-to-categories
 * Assign money to multiple categories using FIFO transaction matching
 */
router.post('/assign-to-categories', validateRequest(assignToCategoriesSchema), asyncHandler(async (req: Request, res: Response) => {
  const { month, assignments } = req.body;
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const result = await AssignmentService.assignToCategories(
    householdId,
    userId,
    month,
    assignments
  );

  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/v1/assignments/auto-assign-all
 * Auto-assign all available money to underfunded categories
 */
router.post('/auto-assign-all', validateRequest(autoAssignAllSchema), asyncHandler(async (req: Request, res: Response) => {
  const { month } = req.body;
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household' });
  }

  const result = await AssignmentService.autoAssignAll(
    householdId,
    userId,
    month
  );

  res.json({
    success: true,
    data: result
  });
}));

export default router;
