import { Router, Request, Response } from 'express';
import { TransactionService } from '../../../services/TransactionService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { createTransactionSchema, updateTransactionSchema } from '../../../validators/transaction.validators';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/transactions
 * Get all transactions for the authenticated user's household
 * Query params: account_id, category_id, start_date, end_date, limit, offset
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access transactions' });
  }

  // Parse query parameters
  const filters = {
    account_id: req.query.account_id as string | undefined,
    category_id: req.query.category_id as string | undefined,
    start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
    end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    min_amount: req.query.min_amount ? parseFloat(req.query.min_amount as string) : undefined,
    max_amount: req.query.max_amount ? parseFloat(req.query.max_amount as string) : undefined,
    search: req.query.search as string | undefined,
    type: req.query.type as 'income' | 'expense' | 'transfer' | undefined
  };

  const transactions = await TransactionService.getAllTransactions(householdId, filters);

  res.json({
    success: true,
    data: transactions,
    count: transactions.length
  });
}));

/**
 * GET /api/v1/transactions/:id
 * Get a specific transaction by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to access transactions' });
  }

  const transaction = await TransactionService.getTransactionById(id, householdId);

  res.json({
    success: true,
    data: transaction
  });
}));

/**
 * POST /api/v1/transactions/transfer
 * Create a transfer between accounts
 */
router.post('/transfer', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;
  const transferData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create transfers' });
  }

  const { outflow, inflow } = await TransactionService.createTransfer(householdId, userId, transferData);

  res.status(201).json({
    success: true,
    data: { outflow, inflow },
    message: 'Transfer created successfully'
  });
}));

/**
 * POST /api/v1/transactions
 * Create a new transaction
 */
router.post('/', validateRequest(createTransactionSchema), asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;
  const userId = req.user!.userId;
  const transactionData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to create transactions' });
  }

  const transaction = await TransactionService.createTransaction(householdId, userId, transactionData);

  res.status(201).json({
    success: true,
    data: transaction
  });
}));

/**
 * PATCH /api/v1/transactions/:id
 * Update a transaction
 */
router.patch('/:id', validateRequest(updateTransactionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to update transactions' });
  }

  const transaction = await TransactionService.updateTransaction(id, householdId, updateData);

  res.json({
    success: true,
    data: transaction
  });
}));

/**
 * DELETE /api/v1/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to delete transactions' });
  }

  await TransactionService.deleteTransaction(id, householdId);

  res.json({
    success: true,
    message: 'Transaction deleted successfully'
  });
}));

/**
 * PATCH /api/v1/transactions/:id/clear
 * Mark a transaction as cleared
 */
router.patch('/:id/clear', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to clear transactions' });
  }

  const transaction = await TransactionService.clearTransaction(id, householdId);

  res.json({
    success: true,
    data: transaction
  });
}));

/**
 * PATCH /api/v1/transactions/:id/reconcile
 * Mark a transaction as reconciled
 */
router.patch('/:id/reconcile', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return res.status(403).json({ error: 'User must belong to a household to reconcile transactions' });
  }

  const transaction = await TransactionService.reconcileTransaction(id, householdId);

  res.json({
    success: true,
    data: transaction
  });
}));

export default router;
