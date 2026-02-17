import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Knex } from 'knex';
import db from '../../config/knex';

export type SessionRecord = {
  id: string;
  userId: string;
  householdId: string | null;
  refreshTokenHash: string;
  rememberMe: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  rotatedToSessionId: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateSessionInput = {
  userId: string;
  householdId: string | null;
  refreshToken: string;
  rememberMe: boolean;
};

class PlatformSessionStore {
  private getScopedDb(trx?: Knex.Transaction): Knex.QueryBuilder {
    const client = trx ?? db;
    return client.withSchema('platform').table('sessions');
  }

  hashRefreshToken(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  async createSession(input: CreateSessionInput, trx?: Knex.Transaction): Promise<SessionRecord> {
    const refreshTokenHash = this.hashRefreshToken(input.refreshToken);
    const expiresAt = this.extractRefreshExpiry(input.refreshToken);

    const [record] = await this.getScopedDb(trx)
      .insert({
        user_id: input.userId,
        household_id: input.householdId,
        refresh_token_hash: refreshTokenHash,
        remember_me: input.rememberMe,
        expires_at: expiresAt,
      })
      .returning('*');

    return this.mapRecord(record);
  }

  async findSessionByRefreshToken(refreshToken: string, trx?: Knex.Transaction): Promise<SessionRecord | null> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const record = await this.getScopedDb(trx).where({ refresh_token_hash: refreshTokenHash }).first();
    return record ? this.mapRecord(record) : null;
  }

  async revokeSessionById(
    sessionId: string,
    reason: string,
    rotatedToSessionId: string | null = null,
    trx?: Knex.Transaction
  ): Promise<void> {
    await this.getScopedDb(trx)
      .where({ id: sessionId })
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
        rotated_to_session_id: rotatedToSessionId,
        last_used_at: new Date(),
        updated_at: new Date(),
      });
  }

  async revokeSessionByRefreshToken(refreshToken: string, reason: string, trx?: Knex.Transaction): Promise<void> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    await this.getScopedDb(trx)
      .where({ refresh_token_hash: refreshTokenHash })
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
        last_used_at: new Date(),
        updated_at: new Date(),
      });
  }

  async rotateSession(oldRefreshToken: string, nextRefreshToken: string, trx?: Knex.Transaction): Promise<SessionRecord> {
    const executor = trx ?? db;

    const run = async (innerTrx: Knex.Transaction): Promise<SessionRecord> => {
      const currentSession = await this.findSessionByRefreshToken(oldRefreshToken, innerTrx);

      if (!currentSession) {
        throw new Error('SESSION_NOT_FOUND');
      }

      if (currentSession.revokedAt) {
        throw new Error('SESSION_REVOKED');
      }

      if (currentSession.expiresAt.getTime() <= Date.now()) {
        await this.revokeSessionById(currentSession.id, 'expired', null, innerTrx);
        throw new Error('SESSION_EXPIRED');
      }

      const nextSession = await this.createSession(
        {
          userId: currentSession.userId,
          householdId: currentSession.householdId,
          refreshToken: nextRefreshToken,
          rememberMe: currentSession.rememberMe,
        },
        innerTrx
      );

      await this.revokeSessionById(currentSession.id, 'rotated', nextSession.id, innerTrx);
      return nextSession;
    };

    if (trx) {
      return run(trx);
    }

    return executor.transaction(run);
  }

  private extractRefreshExpiry(refreshToken: string): Date {
    const decoded = jwt.decode(refreshToken) as JwtPayload | null;
    if (!decoded || typeof decoded.exp !== 'number') {
      throw new Error('Refresh token is missing exp claim');
    }
    return new Date(decoded.exp * 1000);
  }

  private mapRecord(record: any): SessionRecord {
    return {
      id: record.id,
      userId: record.user_id,
      householdId: record.household_id,
      refreshTokenHash: record.refresh_token_hash,
      rememberMe: record.remember_me,
      expiresAt: new Date(record.expires_at),
      revokedAt: record.revoked_at ? new Date(record.revoked_at) : null,
      revokedReason: record.revoked_reason ?? null,
      rotatedToSessionId: record.rotated_to_session_id ?? null,
      lastUsedAt: record.last_used_at ? new Date(record.last_used_at) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new PlatformSessionStore();
