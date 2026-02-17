import crypto from 'crypto';
import { generateRefreshToken } from '../../../utils/jwt';

type SessionRow = {
  id: string;
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

      const whereChain = (predicate: Partial<SessionRow>) => ({
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
      });

      return {
        insert(payload: Partial<SessionRow>) {
          const row: SessionRow = {
            id: `session-${sequence++}`,
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
    });
  });

  describe('AC2: reject replayed/revoked refresh token usage', () => {
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
        userId: 'user-2',
        householdId: 'house-2',
        refreshToken: oldRefreshToken,
        rememberMe: false,
      });
      await PlatformSessionStore.revokeSessionById(current.id, 'logout');

      await expect(
        PlatformSessionStore.rotateSession(oldRefreshToken, newRefreshToken)
      ).rejects.toThrow('SESSION_REVOKED');
    });
  });
});
