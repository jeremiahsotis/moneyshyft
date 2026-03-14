import { Router, Request, Response, NextFunction } from 'express';
import { AccountService } from '../../../services/AccountService';
import { CreditCardService } from '../../../services/CreditCardService';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validate';
import { refusal, success } from '../../../platform/envelopes/response';
import { createAccountSchema, updateAccountSchema } from '../../../validators/account.validators';
import { readString } from '../../../utils/requestValue';

const router = Router();

const requireTenantScopedAccountsContext = (req: Request, res: Response, next: NextFunction): void => {
  if (req.scopeMode === 'ORG_UNIT') {
    refusal(res, {
      code: 'ORG_UNIT_ACCOUNTS_SCOPE_NOT_SUPPORTED',
      message: 'OrgUnit-scoped account access is not enabled for this module yet',
      refusalType: 'business',
      httpStatus: 403,
    });
    return;
  }

  next();
};

// All routes require authentication
router.use(authenticateToken, requireTenantScopedAccountsContext);

/**
 * GET /api/v1/accounts
 * Get all accounts for the authenticated user's household
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const householdId = req.user!.householdId;

  if (!householdId) {
    return refusal(res, {
      code: 'ACCOUNTS_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to access accounts',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const accounts = await AccountService.getAllAccounts(householdId);

  return success(res, {
    code: 'ACCOUNTS_LIST_RETRIEVED',
    message: 'Accounts retrieved successfully',
    data: accounts,
  });
}));

/**
 * GET /api/v1/accounts/:id
 * Get a specific account by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = readString(req.params.id)!;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return refusal(res, {
      code: 'ACCOUNT_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to access accounts',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const account = await AccountService.getAccountById(id, householdId);

  return success(res, {
    code: 'ACCOUNT_RETRIEVED',
    message: 'Account retrieved successfully',
    data: account,
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
    return refusal(res, {
      code: 'ACCOUNT_CREATE_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to create accounts',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const account = await AccountService.createAccount(householdId, accountData);

  return success(res, {
    code: 'ACCOUNT_CREATED',
    message: 'Account created successfully',
    data: account,
    httpStatus: 201,
  });
}));

/**
 * PATCH /api/v1/accounts/:id
 * Update an account
 */
router.patch('/:id', validateRequest(updateAccountSchema), asyncHandler(async (req: Request, res: Response) => {
  const id = readString(req.params.id)!;
  const householdId = req.user!.householdId;
  const updateData = req.body;

  if (!householdId) {
    return refusal(res, {
      code: 'ACCOUNT_UPDATE_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to update accounts',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const account = await AccountService.updateAccount(id, householdId, updateData);

  return success(res, {
    code: 'ACCOUNT_UPDATED',
    message: 'Account updated successfully',
    data: account,
  });
}));

/**
 * DELETE /api/v1/accounts/:id
 * Delete an account (soft delete if has transactions)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = readString(req.params.id)!;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return refusal(res, {
      code: 'ACCOUNT_DELETE_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to delete accounts',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  await AccountService.deleteAccount(id, householdId);

  return success(res, {
    code: 'ACCOUNT_DELETED',
    message: 'Account deleted successfully',
  });
}));

/**
 * GET /api/v1/accounts/:id/credit-card-status
 * Get detailed credit card status with messaging
 */
router.get('/:id/credit-card-status', asyncHandler(async (req: Request, res: Response) => {
  const id = readString(req.params.id)!;
  const householdId = req.user!.householdId;

  if (!householdId) {
    return refusal(res, {
      code: 'CREDIT_CARD_STATUS_HOUSEHOLD_REQUIRED',
      message: 'User must belong to a household to access credit card status',
      refusalType: 'security',
      httpStatus: 403,
    });
  }

  const status = await CreditCardService.getCreditCardStatus(id, householdId);

  return success(res, {
    code: 'CREDIT_CARD_STATUS_RETRIEVED',
    message: 'Credit card status retrieved successfully',
    data: status,
  });
}));

export default router;
