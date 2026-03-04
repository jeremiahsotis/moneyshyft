import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { TagService } from '../../../services/TagService';
import { createTagSchema, updateTagSchema } from '../../../validators/tag.validators';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/v1/tags
 * Get all tags for the household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access tags' });
  }

  const tags = await TagService.getAllTags(householdId);

  res.json({
    success: true,
    data: tags
  });
}));

/**
 * POST /api/v1/tags
 * Create a new tag
 */
router.post('/', validateRequest(createTagSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const tagData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create tags' });
  }

  const tag = await TagService.createTag(householdId, tagData);

  res.status(201).json({
    success: true,
    data: tag
  });
}));

/**
 * PATCH /api/v1/tags/:id
 * Update a tag
 */
router.patch('/:id', validateRequest(updateTagSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to update tags' });
  }

  const tag = await TagService.updateTag(id, householdId, updateData);

  res.json({
    success: true,
    data: tag
  });
}));

/**
 * DELETE /api/v1/tags/:id
 * Delete a tag
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to delete tags' });
  }

  await TagService.deleteTag(id, householdId);

  res.json({
    success: true,
    message: 'Tag deleted successfully'
  });
}));

export default router;
