import { Router, Request, Response } from 'express';
import { CategoryService } from '../../../services/CategoryService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import {
  createSectionSchema,
  updateSectionSchema,
  createCategorySchema,
  updateCategorySchema
} from '../../../validators/category.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ===========================
// SECTIONS
// ===========================

/**
 * GET /api/v1/categories/sections
 * Get all sections for the household
 */
router.get('/sections', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access sections' });
  }

  const sections = await CategoryService.getAllSections(householdId);

  res.json({
    success: true,
    data: sections
  });
}));

/**
 * POST /api/v1/categories/sections
 * Create a new section
 */
router.post('/sections', validateRequest(createSectionSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const sectionData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create sections' });
  }

  const section = await CategoryService.createSection(householdId, sectionData);

  res.status(201).json({
    success: true,
    data: section
  });
}));

/**
 * PATCH /api/v1/categories/sections/:id
 * Update a section
 */
router.patch('/sections/:id', validateRequest(updateSectionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to update sections' });
  }

  const section = await CategoryService.updateSection(id, householdId, updateData);

  res.json({
    success: true,
    data: section
  });
}));

/**
 * DELETE /api/v1/categories/sections/:id
 * Delete a section
 */
router.delete('/sections/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to delete sections' });
  }

  await CategoryService.deleteSection(id, householdId);

  res.json({
    success: true,
    message: 'Section deleted successfully'
  });
}));

// ===========================
// CATEGORIES
// ===========================

/**
 * GET /api/v1/categories
 * Get all categories organized by section
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access categories' });
  }

  const categories = await CategoryService.getAllCategories(householdId);

  res.json({
    success: true,
    data: categories
  });
}));

/**
 * GET /api/v1/categories/:id
 * Get a specific category by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access categories' });
  }

  const category = await CategoryService.getCategoryById(id, householdId);

  res.json({
    success: true,
    data: category
  });
}));

/**
 * POST /api/v1/categories
 * Create a new category
 */
router.post('/', validateRequest(createCategorySchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const categoryData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create categories' });
  }

  const category = await CategoryService.createCategory(householdId, categoryData);

  res.status(201).json({
    success: true,
    data: category
  });
}));

/**
 * PATCH /api/v1/categories/:id
 * Update a category
 */
router.patch('/:id', validateRequest(updateCategorySchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to update categories' });
  }

  const category = await CategoryService.updateCategory(id, householdId, updateData);

  res.json({
    success: true,
    data: category
  });
}));

/**
 * DELETE /api/v1/categories/:id
 * Delete a category
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to delete categories' });
  }

  await CategoryService.deleteCategory(id, householdId);

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
}));

export default router;
