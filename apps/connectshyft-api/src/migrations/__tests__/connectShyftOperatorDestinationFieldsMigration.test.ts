import {
  down,
  up,
} from '../20260322153000_add_connectshyft_operator_destination_fields';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260322153000_add_connectshyft_operator_destination_fields migration', () => {
  it('adds operator-destination columns and E.164 constraints idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('CREATE SCHEMA IF NOT EXISTS connectshyft');
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS phone_e164');
    expect(rawSql).toContain('users_phone_e164_ck');
    expect(rawSql).toContain("phone_e164 ~ '^\\+[1-9][0-9]{1,14}$'");
    expect(rawSql).toContain('ADD COLUMN IF NOT EXISTS default_operator_phone_e164');
    expect(rawSql).toContain('cs_org_unit_escalation_config_default_operator_phone_e164_ck');
    expect(rawSql).toContain("default_operator_phone_e164 ~ '^\\+[1-9][0-9]{1,14}$'");
  });

  it('drops operator-destination columns and constraints on down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawSql = knex.raw.mock.calls.map((call: [string]) => call[0]).join('\n');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS cs_org_unit_escalation_config_default_operator_phone_e164_ck');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS default_operator_phone_e164');
    expect(rawSql).toContain('DROP CONSTRAINT IF EXISTS users_phone_e164_ck');
    expect(rawSql).toContain('DROP COLUMN IF EXISTS phone_e164');
  });
});
