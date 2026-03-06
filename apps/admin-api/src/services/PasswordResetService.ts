import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import db from '../config/knex';

const BCRYPT_ROUNDS = 12;
const DEFAULT_TOKEN_TTL_MINUTES = 60;
const PASSWORD_RESET_PURPOSE_SELF_SERVICE = 'self-service';
const PASSWORD_RESET_PURPOSE_ADMIN = 'admin';

type PasswordResetPurpose = typeof PASSWORD_RESET_PURPOSE_SELF_SERVICE | typeof PASSWORD_RESET_PURPOSE_ADMIN;

type IssueResetLinkInput = {
  userId: string;
  requestedByUserId?: string | null;
  purpose: PasswordResetPurpose;
  resetBaseUrl?: string | null;
};

type IssueResetLinkResult = {
  resetToken: string;
  resetLink: string;
  expiresAtUtc: string;
};

const normalizeResetBaseUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  return trimmed;
};

const resolveResetBaseUrl = (value?: string | null): string => {
  const explicit = normalizeResetBaseUrl(value);
  if (explicit) {
    return explicit;
  }

  const configured = normalizeResetBaseUrl(process.env.PASSWORD_RESET_BASE_URL || null);
  if (configured) {
    return configured;
  }

  return 'http://127.0.0.1:5173/auth/password/reset';
};

const buildResetLink = (token: string, baseUrl?: string | null): string => {
  const url = new URL(resolveResetBaseUrl(baseUrl));
  url.searchParams.set('token', token);
  return url.toString();
};

const hashResetToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const resolveTokenTtlMinutes = (): number => {
  const raw = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  if (!raw) {
    return DEFAULT_TOKEN_TTL_MINUTES;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 5) {
    return DEFAULT_TOKEN_TTL_MINUTES;
  }

  return Math.floor(parsed);
};

const assertPasswordStrength = (password: string): void => {
  if (password.trim().length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
};

class PasswordResetService {
  async issueResetLink(input: IssueResetLinkInput): Promise<IssueResetLinkResult> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + resolveTokenTtlMinutes() * 60 * 1000);

    await db
      .withSchema('platform')
      .table('password_reset_tokens')
      .insert({
        user_id: input.userId,
        requested_by_user_id: input.requestedByUserId || null,
        purpose: input.purpose,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    return {
      resetToken: token,
      resetLink: buildResetLink(token, input.resetBaseUrl),
      expiresAtUtc: expiresAt.toISOString(),
    };
  }

  async requestSelfServiceReset(email: string, resetBaseUrl?: string | null): Promise<{
    requested: true;
    debug?: {
      resetLink: string;
      expiresAtUtc: string;
    };
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { requested: true };
    }

    const user = await db('users')
      .where({ email: normalizedEmail })
      .first(['id']);

    if (!user?.id) {
      return { requested: true };
    }

    const result = await this.issueResetLink({
      userId: user.id,
      requestedByUserId: null,
      purpose: PASSWORD_RESET_PURPOSE_SELF_SERVICE,
      resetBaseUrl,
    });

    if (process.env.NODE_ENV !== 'production') {
      return {
        requested: true,
        debug: {
          resetLink: result.resetLink,
          expiresAtUtc: result.expiresAtUtc,
        },
      };
    }

    return { requested: true };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error('Reset token is required');
    }

    assertPasswordStrength(newPassword);
    const tokenHash = hashResetToken(normalizedToken);

    await db.transaction(async (trx) => {
      const now = new Date();

      const resetToken = await trx
        .withSchema('platform')
        .table('password_reset_tokens')
        .where({ token_hash: tokenHash })
        .whereNull('consumed_at')
        .where('expires_at', '>', now)
        .first(['id', 'user_id']);

      if (!resetToken?.user_id) {
        throw new Error('Invalid or expired reset token');
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await trx('users')
        .where({ id: resetToken.user_id })
        .update({
          password_hash: passwordHash,
          must_reset_password: false,
          password_set_by_admin: false,
          updated_at: trx.fn.now(),
        });

      await trx
        .withSchema('platform')
        .table('password_reset_tokens')
        .where({ id: resetToken.id })
        .update({
          consumed_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

      await trx
        .withSchema('platform')
        .table('password_reset_tokens')
        .where({ user_id: resetToken.user_id })
        .whereNull('consumed_at')
        .andWhereNot({ id: resetToken.id })
        .update({
          consumed_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });
    });
  }

  async applyTemporaryPassword(userId: string, temporaryPassword: string): Promise<void> {
    const resolvedTemporaryPassword = temporaryPassword.trim();
    assertPasswordStrength(resolvedTemporaryPassword);

    const passwordHash = await bcrypt.hash(resolvedTemporaryPassword, BCRYPT_ROUNDS);

    await db('users')
      .where({ id: userId })
      .update({
        password_hash: passwordHash,
        must_reset_password: true,
        password_set_by_admin: true,
        updated_at: db.fn.now(),
      });

    await db
      .withSchema('platform')
      .table('password_reset_tokens')
      .where({ user_id: userId })
      .whereNull('consumed_at')
      .update({
        consumed_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
  }
}

export default new PasswordResetService();
