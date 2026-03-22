import { down, up } from '../20260322130000_add_user_phone_e164';

function buildKnexMock() {
  return {
    knex: {
      raw: jest.fn(async () => undefined),
    } as any,
  };
}

describe('20260322130000_add_user_phone_e164 migration', () => {
  it('adds a nullable canonical user phone column with E.164 validation', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) =>
      call[0].replace(/\s+/g, ' ').trim());

    expect(rawCalls[0]).toBe('ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone_e164 TEXT NULL');
    expect(rawCalls[1]).toContain('users_phone_e164_ck');
    expect(rawCalls[1]).toContain('phone_e164 IS NULL');
    expect(rawCalls[1]).toContain("[1-9][0-9]{1,14}$");
  });

  it('drops the user phone constraint and column in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) =>
      call[0].replace(/\s+/g, ' ').trim());

    expect(rawCalls[0]).toContain('DROP CONSTRAINT IF EXISTS users_phone_e164_ck');
    expect(rawCalls[1]).toContain('DROP COLUMN IF EXISTS phone_e164');
  });
});
