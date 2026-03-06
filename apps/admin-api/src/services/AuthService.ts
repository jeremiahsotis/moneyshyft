import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';
import db from '../config/knex';
import { generateAccessToken, generateRefreshToken, JWTPayload } from '../utils/jwt';
import { generateInvitationCode } from '../utils/invitationCode';
import logger from '../utils/logger';
import { createRecommendedSections } from '../seeds/production/001_recommended_sections';
import { createRecommendedTags } from '../seeds/production/002_recommended_tags';
import { AnalyticsService } from './AnalyticsService';
import PlatformSessionStore from '../platform/sessions/PlatformSessionStore';

const BCRYPT_ROUNDS = 12;

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  householdName?: string; // Optional - creates new household if provided
  invitationCode?: string; // Optional - joins existing household if provided
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  householdId: string | null;
  activeTenantId: string | null;
  activeOrgUnitId: string | null;
  role: string;
  mustResetPassword?: boolean;
  setupWizardCompleted?: boolean;
  createdAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  invitationCode?: string; // Only returned on signup when household is created
}

class AuthService {
  private isMissingPlatformSchemaError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const record = error as { code?: string; message?: string };
    return record.code === '42P01' || record.code === '3F000';
  }

  private parseRoleSetJson(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === 'string');
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((entry): entry is string => typeof entry === 'string')
          : [];
      } catch (_error) {
        return [];
      }
    }

    return [];
  }

  async resolveActiveTenantIdForSession(
    userId: string,
    trxOrDb: Knex | Knex.Transaction = db,
  ): Promise<string | null> {
    try {
      const membership = await trxOrDb
        .withSchema('platform')
        .table('tenant_memberships as tm')
        .leftJoin('tenants as t', 't.id', 'tm.tenant_id')
        .where('tm.user_id', userId)
        .andWhere((query) => {
          query.whereNull('t.status').orWhere('t.status', 'active');
        })
        .select('tm.tenant_id as tenantId')
        .orderBy('tm.tenant_id', 'asc')
        .first();

      const tenantId = typeof membership?.tenantId === 'string'
        ? membership.tenantId.trim()
        : '';
      return tenantId.length > 0 ? tenantId : null;
    } catch (error) {
      if (this.isMissingPlatformSchemaError(error)) {
        return null;
      }

      throw error;
    }
  }

  async resolveActiveOrgUnitIdForSession(
    userId: string,
    tenantId: string | null | undefined,
    baseRole: string | null | undefined,
    trxOrDb: Knex | Knex.Transaction = db,
  ): Promise<string | null> {
    if (!tenantId) {
      return null;
    }

    try {
      const membershipRows = await trxOrDb
        .withSchema('platform')
        .table('org_unit_memberships as om')
        .join('org_units as ou', 'ou.id', 'om.org_unit_id')
        .where('om.user_id', userId)
        .andWhere('ou.tenant_id', tenantId)
        .andWhere('ou.status', 'active')
        .select('om.org_unit_id as orgUnitId')
        .orderBy('om.org_unit_id', 'asc');

      const orgUnitIds = Array.from(new Set(
        membershipRows
          .map((row) => (typeof row.orgUnitId === 'string' ? row.orgUnitId.trim() : ''))
          .filter((entry) => entry.length > 0),
      ));

      if (orgUnitIds.length === 1) {
        return orgUnitIds[0];
      }

      if (orgUnitIds.length > 1) {
        return null;
      }

      const tenantMembership = await trxOrDb
        .withSchema('platform')
        .table('tenant_memberships')
        .where({ tenant_id: tenantId, user_id: userId })
        .first(['role_set_json']);

      const roleSet = this.parseRoleSetJson(tenantMembership?.role_set_json);
      const normalizedBaseRole = typeof baseRole === 'string'
        ? baseRole.trim().toUpperCase()
        : '';
      const isTenantPrivileged = roleSet.includes('TENANT_ADMIN')
        || roleSet.includes('TENANT_STAFF')
        || normalizedBaseRole === 'TENANT_ADMIN'
        || normalizedBaseRole === 'TENANT_STAFF'
        || normalizedBaseRole === 'ADMIN';

      if (!isTenantPrivileged) {
        return null;
      }

      const tenantOrgUnits = await trxOrDb
        .withSchema('platform')
        .table('org_units')
        .where({ tenant_id: tenantId, status: 'active' })
        .select('id')
        .orderBy('id', 'asc')
        .limit(2);

      if (tenantOrgUnits.length === 1 && typeof tenantOrgUnits[0].id === 'string') {
        return tenantOrgUnits[0].id;
      }

      return null;
    } catch (error) {
      if (this.isMissingPlatformSchemaError(error)) {
        return null;
      }

      throw error;
    }
  }

  private async ensurePlatformTenantBootstrap(
    trx: Knex.Transaction,
    householdId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    try {
      const household = await trx('households')
        .select('id', 'name')
        .where({ id: householdId })
        .first();

      const tenantName = household?.name || `Tenant ${householdId.slice(0, 8)}`;
      const roleSet = userRole === 'admin' ? ['TENANT_ADMIN'] : ['TENANT_VIEWER'];

      await trx
        .withSchema('platform')
        .table('tenants')
        .insert({
          id: householdId,
          name: tenantName,
          status: 'active',
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
        })
        .onConflict('id')
        .ignore();

      await trx
        .withSchema('platform')
        .table('tenant_memberships')
        .insert({
          tenant_id: householdId,
          user_id: userId,
          role_set_json: JSON.stringify(roleSet),
          created_at_utc: trx.fn.now(),
          updated_at_utc: trx.fn.now(),
        })
        .onConflict(['tenant_id', 'user_id'])
        .ignore();
    } catch (error) {
      if (this.isMissingPlatformSchemaError(error)) {
        logger.warn('Platform tenant bootstrap skipped because platform schema/tables are unavailable', {
          householdId,
          userId,
        });
        return;
      }

      throw error;
    }
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    const { email, password, firstName, lastName, householdName, invitationCode } = data;

    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Use transaction to create user and optionally household
    const result = await db.transaction(async (trx) => {
      let householdId: string | null = null;
      let returnInvitationCode: string | null = null;

      // Join existing household if invitation code provided
      if (invitationCode) {
        const household = await trx('households')
          .where({ invitation_code: invitationCode.toUpperCase() })
          .first();

        if (!household) {
          throw new Error('Invalid invitation code');
        }

        householdId = household.id;
        logger.info(`User joining household via invitation code`, {
          invitationCode: invitationCode.toUpperCase(),
          householdId: household.id,
          householdName: household.name
        });
      }
      // Create household if name provided
      else if (householdName) {
        // Generate unique invitation code
        let code = generateInvitationCode();
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 100;

        // Ensure uniqueness (with retry logic)
        while (!isUnique && attempts < maxAttempts) {
          const existing = await trx('households')
            .where({ invitation_code: code })
            .first();

          if (!existing) {
            isUnique = true;
          } else {
            code = generateInvitationCode();
            attempts++;
          }
        }

        if (attempts >= maxAttempts) {
          throw new Error('Failed to generate unique invitation code');
        }

        returnInvitationCode = code;

        const [household] = await trx('households')
          .insert({
            name: householdName,
            invitation_code: returnInvitationCode,
          })
          .returning('*');
        householdId = household.id;

        // Create default Income section and category for the new household
        const [incomeSection] = await trx('category_sections')
          .insert({
            household_id: householdId,
            name: 'Income',
            type: 'flexible',
            sort_order: -1, // Place at top
            is_system: true,
          })
          .returning('*');

        await trx('categories')
          .insert({
            household_id: householdId,
            section_id: incomeSection.id,
            name: 'Income',
            icon: '💰',
            color: '#10b981', // green-600
            sort_order: 0,
            is_system: true,
          });

        if (householdId) {
          await createRecommendedSections(trx, householdId);
          await createRecommendedTags(trx, householdId);
        }

        logger.info(`Created default Income category for household: ${householdId}`);
      }

      // Create user (as admin if they created the household, member if joining via code)
      const userRole = householdId && !invitationCode ? 'admin' : 'member';
      const [user] = await trx('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          household_id: householdId,
          role: userRole,
        })
        .returning('*');

      if (householdId) {
        await this.ensurePlatformTenantBootstrap(trx, householdId, user.id, userRole);
      }

      if (householdId) {
        await AnalyticsService.recordEvent(
          'signup_completed',
          householdId,
          user.id,
          {
            createdHousehold: !!householdName,
            usedInvitationCode: !!invitationCode,
          },
          trx
        );
      }

      // Log user creation details
      logger.info(`User created successfully`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        householdId: user.household_id,
        hadInvitationCode: !!invitationCode,
        hadHouseholdName: !!householdName
      });

      // Critical validation: If invitation code was provided, household_id MUST be set
      if (invitationCode && !user.household_id) {
        logger.error(`CRITICAL: User created with invitation code but household_id is NULL in database`, {
          userId: user.id,
          email: user.email,
          invitationCode: invitationCode.toUpperCase(),
          expectedHouseholdId: householdId
        });
        throw new Error('Failed to assign user to household. Please contact support.');
      }

      const activeTenantId = await this.resolveActiveTenantIdForSession(user.id, trx);
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        householdId: user.household_id,
        activeTenantId,
        activeOrgUnitId: await this.resolveActiveOrgUnitIdForSession(
          user.id,
          activeTenantId,
          user.role,
          trx,
        ),
        mustResetPassword: false,
        role: user.role,
      };

      // Log JWT payload creation (redact sensitive data)
      logger.info(`Creating JWT tokens for user`, {
        userId: user.id,
        email: user.email,
        householdId: payload.householdId,
        role: payload.role,
        hasHouseholdId: !!payload.householdId
      });

      // Final validation: Ensure householdId is set if user joined via invitation
      if (invitationCode && !payload.householdId) {
        logger.error(`CRITICAL: JWT payload has null householdId despite invitation code signup`, {
          userId: payload.userId,
          userHouseholdId: user.household_id,
          payloadHouseholdId: payload.householdId
        });
        throw new Error('Authentication error: Invalid household assignment');
      }

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      const tenantId = this.resolveSessionTenantId(payload);
      await PlatformSessionStore.createSession({
        tenantId,
        userId: payload.userId,
        householdId: payload.householdId,
        refreshToken,
        rememberMe: false,
      }, trx);

      return { user, invitationCode: returnInvitationCode, accessToken, refreshToken };
    });

    logger.info(`New user signed up: ${email}`);

    const response: AuthResponse = {
      user: await this.formatUserResponse(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };

    // Include invitation code if household was created
    if (result.invitationCode) {
      response.invitationCode = result.invitationCode;
    }

    return response;
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const { email, password, rememberMe = false } = data;

    // Find user
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login_at: db.fn.now() });

    logger.info(`User logged in: ${email}${rememberMe ? ' (Remember Me enabled)' : ''}`);

    // Generate tokens
    const activeTenantId = await this.resolveActiveTenantIdForSession(user.id);
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      householdId: user.household_id,
      activeTenantId,
      activeOrgUnitId: await this.resolveActiveOrgUnitIdForSession(
        user.id,
        activeTenantId,
        user.role,
      ),
      mustResetPassword: user.must_reset_password === true,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload, rememberMe);
    const refreshToken = generateRefreshToken(payload, rememberMe);
    const tenantId = this.resolveSessionTenantId(payload);
    await PlatformSessionStore.createSession({
      tenantId,
      userId: payload.userId,
      householdId: payload.householdId,
      refreshToken,
      rememberMe,
    });

    return {
      user: await this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await db('users')
      .leftJoin('households', 'users.household_id', 'households.id')
      .select('users.*', 'households.setup_wizard_completed')
      .where({ 'users.id': userId })
      .first();
    if (!user) {
      return null;
    }
    return this.formatUserResponse(user);
  }

  async resetFirstLoginPassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<UserResponse> {
    const user = await db('users').where({ id: input.userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    if (user.must_reset_password !== true) {
      throw new Error('Password reset is not required');
    }

    const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const nextPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await db('users')
      .where({ id: input.userId })
      .update({
        password_hash: nextPasswordHash,
        must_reset_password: false,
        password_set_by_admin: false,
        updated_at: db.fn.now(),
      });

    const refreshedUser = await db('users')
      .where({ id: input.userId })
      .first();

    if (!refreshedUser) {
      throw new Error('User not found');
    }

    return this.formatUserResponse(refreshedUser);
  }

  /**
   * Format user response (remove sensitive data)
   */
  private async formatUserResponse(user: any): Promise<UserResponse> {
    let setupWizardCompleted: boolean | undefined = user.setup_wizard_completed;
    const activeTenantId = await this.resolveActiveTenantIdForSession(user.id);
    const activeOrgUnitId = await this.resolveActiveOrgUnitIdForSession(
      user.id,
      activeTenantId,
      user.role,
    );

    if (setupWizardCompleted === undefined && user.household_id) {
      const household = await db('households')
        .select('setup_wizard_completed')
        .where({ id: user.household_id })
        .first();
      setupWizardCompleted = household?.setup_wizard_completed ?? undefined;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      householdId: user.household_id,
      activeTenantId,
      activeOrgUnitId,
      role: user.role,
      mustResetPassword: user.must_reset_password === true,
      setupWizardCompleted,
      createdAt: user.created_at,
    };
  }

  private resolveSessionTenantId(payload: JWTPayload): string {
    const tenantId = payload.activeTenantId ?? payload.householdId;

    if (!tenantId) {
      throw new Error('Session tenant context is required');
    }

    return tenantId;
  }
}

export default new AuthService();
