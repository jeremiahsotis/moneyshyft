import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import AuthService from '../../../services/AuthService';
import PasswordResetService from '../../../services/PasswordResetService';
import { setAuthCookies, clearAuthCookies, verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../../../utils/jwt';
import { validateRequest } from '../../../middleware/validate';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from '../../../validators/auth.validators';
import { authenticateToken } from '../../../middleware/auth';
import { refusal, success, error as errorEnvelope } from '../../../platform/envelopes/response';
import logger from '../../../utils/logger';
import PlatformSessionStore from '../../../platform/sessions/PlatformSessionStore';
import { generateInvitationCode } from '../../../utils/invitationCode';
import { createRecommendedSections } from '../../../seeds/production/001_recommended_sections';
import { createRecommendedTags } from '../../../seeds/production/002_recommended_tags';

const router = Router();

const testEmail = process.env.TEST_EMAIL?.trim();
const testPassword = process.env.TEST_PASSWORD?.trim();
const testEnv = process.env.TEST_ENV?.trim().toLowerCase();
const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
const isLocalTestScope = testEnv === 'local' || nodeEnv === 'test' || nodeEnv === 'development';
const isTestAuthHarnessEnabled = process.env.ENABLE_TEST_AUTH_HARNESS === 'true'
  && isLocalTestScope
  && nodeEnv !== 'production'
  && !!testEmail
  && !!testPassword;

const BCRYPT_ROUNDS = 12;
const HARNESS_ORG_UNIT_NAME = 'Test Harness Org Unit';
const getDb = (): Knex => {
  // Lazy-load to keep route module import-safe in unit tests that mock app wiring.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../../config/knex').default as Knex;
};

const isUserEmailUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeDbError = error as { code?: string; constraint?: string };
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'users_email_unique';
};

const isMissingPlatformSchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeDbError = error as { code?: string };
  return maybeDbError.code === '42P01' || maybeDbError.code === '3F000';
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const loadHarnessUserByEmail = async (db: Knex, normalizedEmail: string) =>
  db('users')
    .whereRaw('LOWER(email) = ?', [normalizedEmail])
    .first();

const waitForHarnessUser = async (db: Knex, normalizedEmail: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const user = await loadHarnessUserByEmail(db, normalizedEmail);
    if (user) {
      return user;
    }
    await sleep(50);
  }

  return null;
};

const canUseTestAuthCredentials = (email: string, password: string): boolean => {
  if (!isTestAuthHarnessEnabled || !testEmail || !testPassword) {
    return false;
  }

  return email.trim().toLowerCase() === testEmail.toLowerCase() && password === testPassword;
};

const normalizeHarnessRole = (role: string | null | undefined): 'admin' | 'member' =>
  role?.trim().toLowerCase() === 'admin' ? 'admin' : 'member';

const generateUniqueInvitationCode = async (): Promise<string> => {
  const db = getDb();
  let attempts = 0;
  while (attempts < 100) {
    const code = generateInvitationCode();
    const existing = await db('households').where({ invitation_code: code }).first();
    if (!existing) {
      return code;
    }
    attempts += 1;
  }

  throw new Error('Failed to generate unique invitation code for test auth harness');
};

const createHarnessHousehold = async (): Promise<string> => {
  const db = getDb();
  return db.transaction(async (trx: Knex.Transaction) => {
    const invitationCode = await generateUniqueInvitationCode();
    const [household] = await trx('households')
      .insert({
        name: 'Test Household',
        invitation_code: invitationCode,
      })
      .returning('*');

    const [incomeSection] = await trx('category_sections')
      .insert({
        household_id: household.id,
        name: 'Income',
        type: 'flexible',
        sort_order: -1,
        is_system: true,
      })
      .returning('*');

    await trx('categories')
      .insert({
        household_id: household.id,
        section_id: incomeSection.id,
        name: 'Income',
        icon: '💰',
        color: '#10b981',
        sort_order: 0,
        is_system: true,
      });

    await createRecommendedSections(trx, household.id);
    await createRecommendedTags(trx, household.id);

    return household.id;
  });
};

type HarnessUserContext = {
  userId: string;
  role: string | null | undefined;
};

const ensureHarnessBaselineData = async (
  householdId: string,
  harnessUser: HarnessUserContext | null = null,
): Promise<void> => {
  const db = getDb();

  const existingAccount = await db('accounts')
    .where({ household_id: householdId, is_active: true })
    .first();
  if (!existingAccount) {
    await db('accounts').insert({
      household_id: householdId,
      name: 'Test Checking',
      type: 'checking',
      current_balance: 1000,
      starting_balance: 1000,
      is_active: true,
    });
  }

  const existingIncomeSource = await db('income_sources')
    .where({ household_id: householdId, is_active: true })
    .first();
  if (!existingIncomeSource) {
    await db('income_sources').insert({
      household_id: householdId,
      name: 'Test Income',
      monthly_amount: 3000,
      is_active: true,
      sort_order: 0,
      notes: null,
    });
  }

  const household = await db('households')
    .where({ id: householdId })
    .first(['setup_wizard_completed']);
  if (household && !household.setup_wizard_completed) {
    await db('households')
      .where({ id: householdId })
      .update({
        setup_wizard_completed: true,
        setup_wizard_completed_at: db.fn.now(),
      });
  }

  try {
    const tenantNameRow = await db('households')
      .where({ id: householdId })
      .first(['name']);
    const tenantName = typeof tenantNameRow?.name === 'string' && tenantNameRow.name.trim() !== ''
      ? tenantNameRow.name.trim()
      : 'Test Household';

    await db
      .withSchema('platform')
      .table('tenants')
      .insert({
        id: householdId,
        name: tenantName,
        status: 'active',
        created_at_utc: db.fn.now(),
        updated_at_utc: db.fn.now(),
      })
      .onConflict('id')
      .merge({
        name: tenantName,
        status: 'active',
        updated_at_utc: db.fn.now(),
      });

    if (harnessUser?.userId) {
      const normalizedHarnessRole = normalizeHarnessRole(harnessUser.role);
      const tenantRoleSet = normalizedHarnessRole === 'admin' ? ['TENANT_ADMIN'] : ['TENANT_VIEWER'];
      const orgUnitRoleSet = normalizedHarnessRole === 'admin' ? ['ORGUNIT_ADMIN'] : ['ORGUNIT_MEMBER'];

      await db
        .withSchema('platform')
        .table('tenant_memberships')
        .insert({
          tenant_id: householdId,
          user_id: harnessUser.userId,
          role_set_json: JSON.stringify(tenantRoleSet),
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id', 'user_id'])
        .merge({
          role_set_json: JSON.stringify(tenantRoleSet),
          updated_at_utc: db.fn.now(),
        });

      await db
        .withSchema('platform')
        .table('org_units')
        .insert({
          tenant_id: householdId,
          parent_org_unit_id: null,
          type: 'ORG_UNIT',
          node_type: 'ORGUNIT',
          name: HARNESS_ORG_UNIT_NAME,
          status: 'active',
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id', 'name'])
        .merge({
          status: 'active',
          updated_at_utc: db.fn.now(),
        });

      const harnessOrgUnit = await db
        .withSchema('platform')
        .table('org_units')
        .where({
          tenant_id: householdId,
          name: HARNESS_ORG_UNIT_NAME,
          status: 'active',
        })
        .first(['id']);

      if (harnessOrgUnit?.id) {
        await db
          .withSchema('platform')
          .table('org_unit_memberships as om')
          .where('om.user_id', harnessUser.userId)
          .whereIn('om.org_unit_id', db.withSchema('platform').table('org_units').where({ tenant_id: householdId }).select('id'))
          .andWhere('om.org_unit_id', '!=', harnessOrgUnit.id)
          .del();

        await db
          .withSchema('platform')
          .table('org_unit_memberships')
          .insert({
            org_unit_id: harnessOrgUnit.id,
            user_id: harnessUser.userId,
            role_set_json: JSON.stringify(orgUnitRoleSet),
            created_at_utc: db.fn.now(),
            updated_at_utc: db.fn.now(),
          })
          .onConflict(['org_unit_id', 'user_id'])
          .merge({
            role_set_json: JSON.stringify(orgUnitRoleSet),
            updated_at_utc: db.fn.now(),
          });
      }
    }

    const modules = ['moneyshyft', 'connectshyft'] as const;
    for (const moduleKey of modules) {
      await db
        .withSchema('platform')
        .table('tenant_module_entitlements')
        .insert({
          tenant_id: householdId,
          module_key: moduleKey,
          enabled: true,
          reason: 'test-auth-harness-baseline',
          created_by_user_id: null,
          updated_by_user_id: null,
          created_at_utc: db.fn.now(),
          updated_at_utc: db.fn.now(),
        })
        .onConflict(['tenant_id', 'module_key'])
        .merge({
          enabled: true,
          reason: 'test-auth-harness-baseline',
          updated_by_user_id: null,
          updated_at_utc: db.fn.now(),
        });
    }
  } catch (error) {
    if (!isMissingPlatformSchemaError(error)) {
      throw error;
    }
  }
};

const ensureHarnessUser = async (email: string, password: string): Promise<void> => {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  let user = await loadHarnessUserByEmail(db, normalizedEmail);

  if (!user) {
    try {
      const signupResult = await AuthService.signup({
        email: normalizedEmail,
        password,
        firstName: 'Test',
        lastName: 'User',
        householdName: 'Test Household',
      });
      if (signupResult.user.householdId) {
        await ensureHarnessBaselineData(signupResult.user.householdId, {
          userId: signupResult.user.id,
          role: signupResult.user.role,
        });
      }
      return;
    } catch (error) {
      if (!isUserEmailUniqueConstraintError(error)) {
        throw error;
      }

      const existingUser = await waitForHarnessUser(db, normalizedEmail);
      if (!existingUser) {
        throw error;
      }
      user = existingUser;
    }
  }

  const updates: Record<string, unknown> = {};
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    updates.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  if (!user.household_id) {
    updates.household_id = await createHarnessHousehold();
    if (!user.role || user.role === 'member') {
      updates.role = 'admin';
    }
  }

  if (Object.keys(updates).length > 0) {
    await db('users')
      .where({ id: user.id })
      .update(updates);
  }

  const resolvedHouseholdId = (updates.household_id as string | undefined) ?? user.household_id ?? null;
  const resolvedRole = (updates.role as string | undefined) ?? user.role ?? 'member';
  if (resolvedHouseholdId) {
    await ensureHarnessBaselineData(resolvedHouseholdId, {
      userId: user.id,
      role: resolvedRole,
    });
  }
};

/**
 * POST /api/v1/auth/signup
 * Signup is disabled outside the test auth harness. Users must be provisioned through admin workflows.
 */
router.post('/signup', validateRequest(signupSchema), async (req: Request, res: Response) => {
  if (!isTestAuthHarnessEnabled) {
    refusal(res, {
      code: 'SIGNUP_DISABLED',
      message: 'Signup is disabled. Contact an administrator for account access.',
      refusalType: 'client',
      httpStatus: 410,
    });
    return;
  }

  try {
    const { user, accessToken, refreshToken, invitationCode } = await AuthService.signup(req.body);

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'User created successfully',
      user,
      invitationCode,
    });
  } catch (error) {
    logger.error('Signup error:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Signup failed',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const normalizedEmail = req.body.email.trim().toLowerCase();
    const { rememberMe = false } = req.body;

    if (canUseTestAuthCredentials(req.body.email, req.body.password)) {
      await ensureHarnessUser(normalizedEmail, req.body.password);
      const { user, accessToken, refreshToken } = await AuthService.login({
        email: normalizedEmail,
        password: req.body.password,
        rememberMe
      });

      setAuthCookies(res, accessToken, refreshToken, rememberMe);
      res.json({
        message: 'Login successful',
        user
      });
      return;
    }

    const { user, accessToken, refreshToken } = await AuthService.login({
      ...req.body,
      email: normalizedEmail,
    });

    // Set HTTP-only cookies with extended duration if rememberMe is true
    setAuthCookies(res, accessToken, refreshToken, rememberMe);

    res.json({
      message: 'Login successful',
      user,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (typeof refreshToken === 'string' && refreshToken.trim() !== '') {
    try {
      await PlatformSessionStore.revokeSessionByRefreshToken(refreshToken, 'logout');
    } catch (error) {
      logger.warn('Failed to revoke refresh session on logout', { error });
    }
  }

  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    const sessionTenantId = payload.activeTenantId ?? payload.householdId;

    if (!sessionTenantId) {
      throw new Error('SESSION_TENANT_MISSING');
    }

    // Log token refresh for debugging
    logger.info('Refreshing access token', {
      userId: payload.userId,
      householdId: payload.householdId,
      hasHouseholdId: !!payload.householdId
    });

    const storedSession = await PlatformSessionStore.findSessionByRefreshToken(refreshToken, sessionTenantId);
    if (!storedSession || storedSession.revokedAt || storedSession.userId !== payload.userId) {
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }

    if (storedSession.expiresAt.getTime() <= Date.now()) {
      await PlatformSessionStore.revokeSessionById(storedSession.id, 'expired', null, undefined, sessionTenantId);
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }

    const currentUser = await AuthService.getUserById(payload.userId);
    if (!currentUser) {
      refusal(res, {
        code: 'REFRESH_TOKEN_REJECTED',
        message: 'Refresh token rejected',
        refusalType: 'security',
        httpStatus: 403,
      });
      return;
    }

    const activeTenantId = await AuthService.resolveActiveTenantIdForSession(payload.userId);
    const refreshedPayload = {
      userId: payload.userId,
      email: payload.email,
      householdId: currentUser.householdId,
      activeTenantId,
      activeOrgUnitId: await AuthService.resolveActiveOrgUnitIdForSession(
        payload.userId,
        activeTenantId,
        currentUser.role,
      ),
      mustResetPassword: currentUser.mustResetPassword === true,
      role: currentUser.role,
    };

    const rememberMe = storedSession.rememberMe;
    const newAccessToken = generateAccessToken(refreshedPayload, rememberMe);
    const newRefreshToken = generateRefreshToken(refreshedPayload, rememberMe);

    await PlatformSessionStore.rotateSession(refreshToken, newRefreshToken, sessionTenantId);

    setAuthCookies(res, newAccessToken, newRefreshToken, rememberMe);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    logger.error('Token refresh error:', error);

    try {
      await PlatformSessionStore.revokeSessionByRefreshToken(refreshToken, 'invalid_or_expired_refresh_token');
    } catch (revokeError) {
      logger.warn('Failed to revoke refresh session after token refresh failure', { revokeError });
    }

    if (
      error instanceof Error
      && (error.message === 'SESSION_REVOKED'
        || error.message === 'SESSION_EXPIRED'
        || error.message === 'SESSION_TENANT_MISSING')
    ) {
      res.status(403).json({ error: 'Refresh token rejected' });
      return;
    }
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /api/v1/auth/password/forgot
 * Start a self-service password reset flow.
 */
router.post('/password/forgot', validateRequest(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const result = await PasswordResetService.requestSelfServiceReset(
      req.body.email,
      typeof req.body.resetBaseUrl === 'string' ? req.body.resetBaseUrl : undefined,
    );

    success(res, {
      code: 'PASSWORD_RESET_REQUEST_ACCEPTED',
      message: 'If an account exists, reset instructions have been generated.',
      data: result,
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    errorEnvelope(res, {
      code: 'PASSWORD_RESET_REQUEST_FAILED',
      message: 'Failed to request password reset',
      httpStatus: 500,
    });
  }
});

/**
 * POST /api/v1/auth/password/reset
 * Complete password reset using a valid reset token.
 */
router.post('/password/reset', validateRequest(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    await PasswordResetService.resetPasswordWithToken(req.body.token, req.body.newPassword);
    success(res, {
      code: 'PASSWORD_RESET_COMPLETED',
      message: 'Password updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    if (message === 'Invalid or expired reset token') {
      refusal(res, {
        code: 'PASSWORD_RESET_TOKEN_INVALID',
        message,
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    logger.error('Password reset completion error:', error);
    errorEnvelope(res, {
      code: 'PASSWORD_RESET_COMPLETION_FAILED',
      message: 'Failed to reset password',
      httpStatus: 500,
    });
  }
});

/**
 * POST /api/v1/auth/password/first-login-reset
 * Complete required first-login password reset for admin-created users.
 */
router.post('/password/first-login-reset', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      refusal(res, {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Not authenticated',
        refusalType: 'security',
        httpStatus: 401,
      });
      return;
    }

    const currentPassword = typeof req.body?.currentPassword === 'string'
      ? req.body.currentPassword
      : '';
    const newPassword = typeof req.body?.newPassword === 'string'
      ? req.body.newPassword
      : '';

    if (!currentPassword || !newPassword) {
      refusal(res, {
        code: 'FIRST_LOGIN_RESET_INPUT_INVALID',
        message: 'currentPassword and newPassword are required',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    if (newPassword.length < 8) {
      refusal(res, {
        code: 'FIRST_LOGIN_RESET_PASSWORD_TOO_SHORT',
        message: 'newPassword must be at least 8 characters long',
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }

    const user = await AuthService.resetFirstLoginPassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
    });

    const activeTenantId = await AuthService.resolveActiveTenantIdForSession(user.id);
    const payload = {
      userId: user.id,
      email: user.email,
      householdId: user.householdId,
      activeTenantId,
      activeOrgUnitId: await AuthService.resolveActiveOrgUnitIdForSession(
        user.id,
        activeTenantId,
        user.role,
      ),
      mustResetPassword: false,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    setAuthCookies(res, accessToken, refreshToken);

    success(res, {
      code: 'FIRST_LOGIN_PASSWORD_RESET_COMPLETED',
      message: 'Password updated successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('First-login password reset error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    if (message === 'Current password is incorrect') {
      refusal(res, {
        code: 'FIRST_LOGIN_RESET_CURRENT_PASSWORD_INCORRECT',
        message,
        refusalType: 'client',
        httpStatus: 400,
      });
      return;
    }
    if (message === 'Password reset is not required') {
      refusal(res, {
        code: 'FIRST_LOGIN_RESET_NOT_REQUIRED',
        message,
        refusalType: 'business',
        httpStatus: 409,
      });
      return;
    }
    if (message === 'User not found') {
      refusal(res, {
        code: 'FIRST_LOGIN_RESET_USER_NOT_FOUND',
        message,
        refusalType: 'client',
        httpStatus: 404,
      });
      return;
    }
    errorEnvelope(res, {
      code: 'FIRST_LOGIN_RESET_FAILED',
      message: 'Failed to reset password',
      httpStatus: 500,
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await AuthService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
