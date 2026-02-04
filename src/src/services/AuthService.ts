import bcrypt from 'bcryptjs';
import db from '../config/knex';
import { generateAccessToken, generateRefreshToken, JWTPayload } from '../utils/jwt';
import { generateInvitationCode } from '../utils/invitationCode';
import logger from '../utils/logger';
import { createRecommendedSections } from '../seeds/production/001_recommended_sections';
import { createRecommendedTags } from '../seeds/production/002_recommended_tags';
import { AnalyticsService } from './AnalyticsService';

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
  role: string;
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

      return { user, invitationCode: returnInvitationCode };
    });

    logger.info(`New user signed up: ${email}`);

    // Generate tokens
    const payload: JWTPayload = {
      userId: result.user.id,
      email: result.user.email,
      householdId: result.user.household_id,
      role: result.user.role,
    };

    // Log JWT payload creation (redact sensitive data)
    logger.info(`Creating JWT tokens for user`, {
      userId: result.user.id,
      email: result.user.email,
      householdId: payload.householdId,
      role: payload.role,
      hasHouseholdId: !!payload.householdId
    });

    // Final validation: Ensure householdId is set if user joined via invitation
    if (data.invitationCode && !payload.householdId) {
      logger.error(`CRITICAL: JWT payload has null householdId despite invitation code signup`, {
        userId: payload.userId,
        userHouseholdId: result.user.household_id,
        payloadHouseholdId: payload.householdId
      });
      throw new Error('Authentication error: Invalid household assignment');
    }

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const response: AuthResponse = {
      user: await this.formatUserResponse(result.user),
      accessToken,
      refreshToken,
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
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      householdId: user.household_id,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload, rememberMe);
    const refreshToken = generateRefreshToken(payload, rememberMe);

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

  /**
   * Format user response (remove sensitive data)
   */
  private async formatUserResponse(user: any): Promise<UserResponse> {
    let setupWizardCompleted: boolean | undefined = user.setup_wizard_completed;

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
      role: user.role,
      setupWizardCompleted,
      createdAt: user.created_at,
    };
  }
}

export default new AuthService();
