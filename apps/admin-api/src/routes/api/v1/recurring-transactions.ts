import { Router, Request, Response } from 'express';
import { RecurringTransactionService } from '../../../services/RecurringTransactionService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createRecurringSchema,
  updateRecurringSchema,
  skipInstanceSchema,
  updateInstanceSchema
} from '../../../validators/recurring.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ========================================
// RECURRING TRANSACTION TEMPLATES
// ========================================

/**
 * POST /api/v1/recurring-transactions
 * Create a new recurring transaction template
 */
router.post(
  '/',
  validateRequest(createRecurringSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const recurring = await RecurringTransactionService.createRecurring(
      householdId,
      userId,
      req.body
    );

    res.status(201).json({
      success: true,
      data: recurring
    });
  })
);

/**
 * GET /api/v1/recurring-transactions
 * Get all recurring transaction templates for household
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const templates = await RecurringTransactionService.getAllRecurring(householdId);

    res.json({
      success: true,
      data: templates
    });
  })
);

/**
 * GET /api/v1/recurring-transactions/:id
 * Get a single recurring transaction template
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const template = await RecurringTransactionService.getRecurring(id, householdId);

    res.json({
      success: true,
      data: template
    });
  })
);

/**
 * PATCH /api/v1/recurring-transactions/:id
 * Update a recurring transaction template
 */
router.patch(
  '/:id',
  validateRequest(updateRecurringSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.updateRecurring(
      id,
      householdId,
      req.body
    );

    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * DELETE /api/v1/recurring-transactions/:id
 * Deactivate a recurring transaction template
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    await RecurringTransactionService.deactivateRecurring(id, householdId);

    res.json({
      success: true,
      message: 'Recurring transaction deactivated'
    });
  })
);

/**
 * POST /api/v1/recurring-transactions/:id/toggle-auto-post
 * Toggle auto-post setting for a recurring transaction
 */
router.post(
  '/:id/toggle-auto-post',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.toggleAutoPost(id, householdId);

    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * POST /api/v1/recurring-transactions/:id/generate-instances
 * Manually trigger instance generation for a specific template
 */
router.post(
  '/:id/generate-instances',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const daysAhead = req.body.days_ahead || 30;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const instancesCreated = await RecurringTransactionService.generateInstancesForRecurring(
      id,
      householdId,
      daysAhead
    );

    res.json({
      success: true,
      message: `Generated ${instancesCreated} instances`
    });
  })
);

// ========================================
// RECURRING TRANSACTION INSTANCES
// ========================================

/**
 * GET /api/v1/recurring-transactions/instances/pending
 * Get pending instances (upcoming within specified days)
 */
router.get(
  '/instances/pending',
  asyncHandler(async (req: Request, res: Response) => {
    const householdId = req.user!.householdId;
    const daysAhead = parseInt(req.query.days as string) || 7;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const instances = await RecurringTransactionService.getPendingInstances(
      householdId,
      daysAhead
    );

    res.json({
      success: true,
      data: instances
    });
  })
);

/**
 * GET /api/v1/recurring-transactions/instances/all
 * Get all instances (any status)
 */
router.get(
  '/instances/all',
  asyncHandler(async (req: Request, res: Response) => {
    const householdId = req.user!.householdId;
    const status = req.query.status as any;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const instances = await RecurringTransactionService.getAllInstances(householdId, status);

    res.json({
      success: true,
      data: instances
    });
  })
);

/**
 * POST /api/v1/recurring-transactions/instances/:id/approve
 * Approve an instance
 */
router.post(
  '/instances/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.approveInstance(
      id,
      householdId,
      userId
    );

    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * POST /api/v1/recurring-transactions/instances/:id/skip
 * Skip an instance
 */
router.post(
  '/instances/:id/skip',
  validateRequest(skipInstanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;
    const { reason } = req.body;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.skipInstance(
      id,
      householdId,
      userId,
      reason
    );

    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * POST /api/v1/recurring-transactions/instances/:id/post
 * Post an approved instance as an actual transaction
 */
router.post(
  '/instances/:id/post',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.postInstance(
      id,
      householdId,
      userId
    );

    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * PATCH /api/v1/recurring-transactions/instances/:id
 * Edit an instance before posting
 */
router.patch(
  '/instances/:id',
  validateRequest(updateInstanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household' });
    }

    const updated = await RecurringTransactionService.updateInstance(
      id,
      householdId,
      req.body
    );

    res.json({
      success: true,
      data: updated
    });
  })
);

export default router;
