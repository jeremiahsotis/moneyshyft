import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Knex } from 'knex';
import db from '../../config/knex';

export type SessionRecord = {
  id: string;
  tenantId: string;
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
  tenantId: string;
  userId: string;
  householdId: string | null;
  refreshToken: string;
  rememberMe: boolean;
};

class PlatformSessionStore {
  private tenantColumnSupport: Promise<boolean> | null = null;

  private getScopedDb(trx?: Knex.Transaction): Knex.QueryBuilder {
    const client = trx ?? db;
    return client.withSchema('platform').table('sessions');
  }

  private async hasTenantColumn(): Promise<boolean> {
    if (!this.tenantColumnSupport) {
      const schema = (db as Knex & { schema?: Knex['schema'] }).schema;
      if (!schema || typeof schema.withSchema !== 'function') {
        this.tenantColumnSupport = Promise.resolve(true);
      } else {
        this.tenantColumnSupport = schema
          .withSchema('platform')
          .hasColumn('sessions', 'tenant_id')
          .catch(() => false);
      }
    }

    return this.tenantColumnSupport;
  }

  private async resolveTenantColumn(): Promise<'tenant_id' | 'household_id'> {
    return (await this.hasTenantColumn()) ? 'tenant_id' : 'household_id';
  }

  hashRefreshToken(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  async createSession(input: CreateSessionInput, trx?: Knex.Transaction): Promise<SessionRecord> {
    const refreshTokenHash = this.hashRefreshToken(input.refreshToken);
    const expiresAt = this.extractRefreshExpiry(input.refreshToken);
    const tenantColumn = await this.resolveTenantColumn();

    const [record] = await this.getScopedDb(trx)
      .insert({
        user_id: input.userId,
        household_id: input.householdId,
        [tenantColumn]: input.tenantId,
        refresh_token_hash: refreshTokenHash,
        remember_me: input.rememberMe,
        expires_at: expiresAt,
      })
      .returning('*');

    return this.mapRecord(record);
  }

  async findSessionByRefreshToken(
    refreshToken: string,
    tenantId?: string,
    trx?: Knex.Transaction
  ): Promise<SessionRecord | null> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const tenantColumn = await this.resolveTenantColumn();
    const query = this.getScopedDb(trx).where({ refresh_token_hash: refreshTokenHash });

    if (tenantId) {
      query.andWhere({ [tenantColumn]: tenantId });
    }

    const record = await query.first();
    return record ? this.mapRecord(record) : null;
  }

  async revokeSessionById(
    sessionId: string,
    reason: string,
    rotatedToSessionId: string | null = null,
    trx?: Knex.Transaction,
    tenantId?: string
  ): Promise<void> {
    const tenantColumn = await this.resolveTenantColumn();
    const query = this.getScopedDb(trx).where({ id: sessionId }).whereNull('revoked_at');

    if (tenantId) {
      query.andWhere({ [tenantColumn]: tenantId });
    }

    await query.update({
      revoked_at: new Date(),
      revoked_reason: reason,
      rotated_to_session_id: rotatedToSessionId,
      last_used_at: new Date(),
      updated_at: new Date(),
    });
  }

  async revokeSessionByRefreshToken(
    refreshToken: string,
    reason: string,
    trx?: Knex.Transaction,
    tenantId?: string
  ): Promise<void> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const tenantColumn = await this.resolveTenantColumn();
    const query = this.getScopedDb(trx)
      .where({ refresh_token_hash: refreshTokenHash })
      .whereNull('revoked_at');

    if (tenantId) {
      query.andWhere({ [tenantColumn]: tenantId });
    }

    await query.update({
      revoked_at: new Date(),
      revoked_reason: reason,
      last_used_at: new Date(),
      updated_at: new Date(),
    });
  }

  async rotateSession(
    oldRefreshToken: string,
    nextRefreshToken: string,
    tenantId: string,
    trx?: Knex.Transaction
  ): Promise<SessionRecord> {
    const executor = trx ?? db;
    const tenantColumn = await this.resolveTenantColumn();

    const run = async (innerTrx: Knex.Transaction): Promise<SessionRecord> => {
      const oldRefreshTokenHash = this.hashRefreshToken(oldRefreshToken);
      const currentSessionRecord = await this.getScopedDb(innerTrx)
        .where({ refresh_token_hash: oldRefreshTokenHash, [tenantColumn]: tenantId })
        .forUpdate()
        .first();

      const currentSession = currentSessionRecord ? this.mapRecord(currentSessionRecord) : null;

      if (!currentSession) {
        throw new Error('SESSION_NOT_FOUND');
      }

      if (currentSession.tenantId !== tenantId) {
        throw new Error('SESSION_TENANT_MISMATCH');
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
          tenantId: currentSession.tenantId,
          userId: currentSession.userId,
          householdId: currentSession.householdId,
          refreshToken: nextRefreshToken,
          rememberMe: currentSession.rememberMe,
        },
        innerTrx
      );

      await this.revokeSessionById(currentSession.id, 'rotated', nextSession.id, innerTrx, tenantId);
      return nextSession;
    };

    if (trx) {
      return run(trx);
    }

    return executor.transaction(run);
  }

  private extractRefreshExpiry(refreshToken: string): Date {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_change_in_production'
      ) as JwtPayload | string;

      if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
        throw new Error('Refresh token is missing exp claim');
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }

  private mapRecord(record: any): SessionRecord {
    const tenantId = record.tenant_id ?? record.household_id;

    return {
      id: record.id,
      tenantId,
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
