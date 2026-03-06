import { Router, Request, Response } from 'express';
import { AccountService } from '../../../services/AccountService';
import { CreditCardService } from '../../../services/CreditCardService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { createAccountSchema, updateAccountSchema } from '../../../validators/account.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/accounts
 * Get all accounts for the authenticated user's household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access accounts' });
  }

  const accounts = await AccountService.getAllAccounts(householdId);

  res.json({
    success: true,
    data: accounts
  });
}));

/**
 * GET /api/v1/accounts/:id
 * Get a specific account by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access accounts' });
  }

  const account = await AccountService.getAccountById(id, householdId);

  res.json({
    success: true,
    data: account
  });
}));

/**
 * POST /api/v1/accounts
 * Create a new account
 */
router.post('/', validateRequest(createAccountSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const accountData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create accounts' });
  }

  const account = await AccountService.createAccount(householdId, accountData);

  res.status(201).json({
    success: true,
    data: account
  });
}));

/**
 * PATCH /api/v1/accounts/:id
 * Update an account
 */
router.patch('/:id', validateRequest(updateAccountSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to update accounts' });
  }

  const account = await AccountService.updateAccount(id, householdId, updateData);

  res.json({
    success: true,
    data: account
  });
}));

/**
 * DELETE /api/v1/accounts/:id
 * Delete an account (soft delete if has transactions)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to delete accounts' });
  }

  await AccountService.deleteAccount(id, householdId);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

/**
 * GET /api/v1/accounts/:id/credit-card-status
 * Get detailed credit card status with messaging
 */
router.get('/:id/credit-card-status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access credit card status' });
  }

  const status = await CreditCardService.getCreditCardStatus(id, householdId);

  res.json({
    success: true,
    data: status
  });
}));

export default router;
