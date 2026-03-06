import { Router, Request, Response } from 'express';
import { SplitTransactionService } from '../../../services/SplitTransactionService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { createSplitSchema, updateSplitSchema, unsplitTransactionSchema } from '../../../validators/split.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/v1/transactions/:id/split
 * Convert an existing transaction into a split transaction
 */
router.post(
  '/:id/split',
  validateRequest(createSplitSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;
    const { splits } = req.body;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household to split transactions' });
    }

    const result = await SplitTransactionService.createSplits(id, householdId, userId, splits);

    res.status(201).json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /api/v1/transactions/:id/splits
 * Get split details for a transaction
 */
router.get(
  '/:id/splits',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household to view splits' });
    }

    const result = await SplitTransactionService.getSplits(id, householdId);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * PATCH /api/v1/transactions/:id/splits
 * Update existing splits (add/remove/modify)
 */
router.patch(
  '/:id/splits',
  validateRequest(updateSplitSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const userId = req.user!.userId;
    const { splits } = req.body;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household to update splits' });
    }

    const result = await SplitTransactionService.updateSplits(id, householdId, userId, splits);

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * DELETE /api/v1/transactions/:id/split
 * Unsplit a transaction (merge back to single transaction)
 */
router.delete(
  '/:id/split',
  validateRequest(unsplitTransactionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const householdId = req.user!.householdId;
    const { category_id } = req.body;

    if (!householdId) {
      return res.status(403).json({ error: 'User must belong to a household to unsplit transactions' });
    }

    const transaction = await SplitTransactionService.unsplitTransaction(
      id,
      householdId,
      category_id
    );

    res.json({
      success: true,
      data: transaction
    });
  })
);

export default router;
