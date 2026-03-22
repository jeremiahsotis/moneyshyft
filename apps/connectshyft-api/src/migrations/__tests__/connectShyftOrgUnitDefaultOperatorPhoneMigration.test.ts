import { down, up } from '../20260322133000_add_connectshyft_org_unit_default_operator_phone';

function buildKnexMock() {
  return {
    knex: {
      raw: jest.fn(async () => undefined),
    } as any,
  };
}

describe('20260322133000_add_connectshyft_org_unit_default_operator_phone migration', () => {
  it('adds the orgUnit default operator phone column with canonical E.164 validation', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) =>
      call[0].replace(/\s+/g, ' ').trim());

    expect(rawCalls).toEqual(expect.arrayContaining([
      'CREATE SCHEMA IF NOT EXISTS connectshyft',
    ]));
    expect(rawCalls[1]).toBe(
      'ALTER TABLE IF EXISTS connectshyft.cs_org_unit_escalation_config ADD COLUMN IF NOT EXISTS default_operator_phone_e164 TEXT NULL',
    );
    expect(rawCalls[2]).toContain('cs_org_unit_escalation_config_default_operator_phone_e164_ck');
    expect(rawCalls[2]).toContain('default_operator_phone_e164 IS NULL');
    expect(rawCalls[2]).toContain("[1-9][0-9]{1,14}$");
  });

  it('drops the orgUnit default operator phone constraint and column in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) =>
      call[0].replace(/\s+/g, ' ').trim());

    expect(rawCalls[0]).toContain(
      'DROP CONSTRAINT IF EXISTS cs_org_unit_escalation_config_default_operator_phone_e164_ck',
    );
    expect(rawCalls[1]).toContain('DROP COLUMN IF EXISTS default_operator_phone_e164');
  });
});
