import crypto from 'crypto';
import { generateRefreshToken } from '../../../utils/jwt';

type SessionRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  household_id: string | null;
  refresh_token_hash: string;
  remember_me: boolean;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  rotated_to_session_id: string | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

let sessionRows: SessionRow[] = [];
let sequence = 1;

const now = () => new Date('2026-02-17T12:00:00.000Z');

const fakeDb: any = {
  withSchema(schemaName: string) {
    if (schemaName !== 'platform') {
      throw new Error(`Unhandled schema: ${schemaName}`);
    }

    return {
      table(tableName: string) {
      if (tableName !== 'sessions') {
        throw new Error(`Unhandled table: ${tableName}`);
      }

      const whereChain = (predicate: Partial<SessionRow>) => {
        const chain: any = {
          first: async () => {
            const match = sessionRows.find((row) =>
              Object.entries(predicate).every(([key, value]) => (row as any)[key] === value)
            );
            return match ?? undefined;
          },
          update: async (changes: Partial<SessionRow>) => {
            let updated = 0;
            sessionRows = sessionRows.map((row) => {
              const matches = Object.entries(predicate).every(([key, value]) => (row as any)[key] === value);
              if (!matches) {
                return row;
              }
              updated += 1;
              return { ...row, ...changes };
            });
            return updated;
          },
        };

        chain.forUpdate = () => chain;
        chain.whereNull = () => chain;
        chain.andWhere = (nextPredicate: Partial<SessionRow>) => whereChain({ ...predicate, ...nextPredicate });
        return chain;
      };

      return {
        insert(payload: Partial<SessionRow>) {
          const row: SessionRow = {
            id: `session-${sequence++}`,
            tenant_id: payload.tenant_id!,
            user_id: payload.user_id!,
            household_id: payload.household_id ?? null,
            refresh_token_hash: payload.refresh_token_hash!,
            remember_me: payload.remember_me ?? false,
            expires_at: payload.expires_at!,
            revoked_at: null,
            revoked_reason: null,
            rotated_to_session_id: null,
            last_used_at: null,
            created_at: now(),
            updated_at: now(),
          };
          sessionRows.push(row);
          return {
            returning: async () => [row],
          };
        },
        where: whereChain,
      };
      },
    };
  },
  transaction: async (callback: (trx: any) => Promise<any>) => callback(fakeDb),
};

jest.mock('../../../config/knex', () => ({
  __esModule: true,
  default: fakeDb,
}));

import PlatformSessionStore from '../PlatformSessionStore';

describe('PlatformSessionStore', () => {
  beforeEach(() => {
    sessionRows = [];
    sequence = 1;
  });

  describe('AC1: persist hashed refresh state with expiry/revocation metadata', () => {
    it('stores only refresh hash plus expiry metadata in platform.sessions', async () => {
      const refreshToken = generateRefreshToken({
        userId: 'user-1',
        email: 'user-1@example.com',
        householdId: 'house-1',
        role: 'member',
      });

      const created = await PlatformSessionStore.createSession({
        tenantId: 'house-1',
        userId: 'user-1',
        householdId: 'house-1',
        refreshToken,
        rememberMe: false,
      });

      expect(created.refreshTokenHash).toBe(
        crypto.createHash('sha256').update(refreshToken).digest('hex')
      );
      expect(created.refreshTokenHash).not.toContain(refreshToken.slice(0, 8));
      expect(created.expiresAt.getTime()).toBeGreaterThan(now().getTime());
      expect(created.revokedAt).toBeNull();
      expect(created.revokedReason).toBeNull();
      expect(created.tenantId).toBe('house-1');
    });

    it('rejects tampered refresh tokens when extracting expiry metadata', async () => {
      const refreshToken = generateRefreshToken({
        userId: 'user-9',
        email: 'user-9@example.com',
        householdId: 'house-9',
        role: 'member',
      });

      await expect(
        PlatformSessionStore.createSession({
          tenantId: 'house-9',
          userId: 'user-9',
          householdId: 'house-9',
          refreshToken: `${refreshToken}tampered`,
          rememberMe: false,
        })
      ).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });
  });

  describe('AC2: reject replayed/revoked refresh token usage', () => {
    it('rejects replay of an already-rotated refresh token', async () => {
      const oldRefreshToken = generateRefreshToken({
        userId: 'user-2',
        email: 'user-2@example.com',
        householdId: 'house-2',
        role: 'member',
      });
      const rotatedRefreshToken = generateRefreshToken({
        userId: 'user-2',
        email: 'user-2@example.com',
        householdId: 'house-2',
        role: 'member',
      });
      const replayAttemptRefreshToken = generateRefreshToken({
        userId: 'user-2',
        email: 'user-2@example.com',
        householdId: 'house-2',
        role: 'member',
      });

      await PlatformSessionStore.createSession({
        tenantId: 'house-2',
        userId: 'user-2',
        householdId: 'house-2',
        refreshToken: oldRefreshToken,
        rememberMe: false,
      });

      const nextSession = await PlatformSessionStore.rotateSession(oldRefreshToken, rotatedRefreshToken, 'house-2');

      const oldSessionHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
      const oldSessionRow = sessionRows.find((row) => row.refresh_token_hash === oldSessionHash);
      expect(oldSessionRow?.revoked_reason).toBe('rotated');
      expect(oldSessionRow?.rotated_to_session_id).toBe(nextSession.id);

      await expect(
        PlatformSessionStore.rotateSession(oldRefreshToken, replayAttemptRefreshToken, 'house-2')
      ).rejects.toThrow('SESSION_REVOKED');
    });

    it('throws SESSION_REVOKED when rotating a revoked refresh token', async () => {
      const oldRefreshToken = generateRefreshToken({
        userId: 'user-2',
        email: 'user-2@example.com',
        householdId: 'house-2',
        role: 'member',
      });
      const newRefreshToken = generateRefreshToken({
        userId: 'user-2',
        email: 'user-2@example.com',
        householdId: 'house-2',
        role: 'member',
      });

      const current = await PlatformSessionStore.createSession({
        tenantId: 'house-2',
        userId: 'user-2',
        householdId: 'house-2',
        refreshToken: oldRefreshToken,
        rememberMe: false,
      });
      await PlatformSessionStore.revokeSessionById(current.id, 'logout');

      await expect(
        PlatformSessionStore.rotateSession(oldRefreshToken, newRefreshToken, 'house-2')
      ).rejects.toThrow('SESSION_REVOKED');
    });
  });
});
