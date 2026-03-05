import { down, up } from '../20260303170000_add_connectshyft_webhook_receipt_replay_identity';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260303170000_add_connectshyft_webhook_receipt_replay_identity migration', () => {
  it('adds replay identity columns and tenant/provider/sid/event-type uniqueness', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS sid TEXT'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS event_type TEXT'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN sid SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN event_type SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_webhook_receipts_provider_dedupe_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('UNIQUE (tenant_id, provider_name, sid, event_type)'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_webhook_receipts_retention_idx'))).toBe(true);
  });

  it('restores legacy dedupe uniqueness and removes replay identity columns in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_webhook_receipts_replay_identity_uq'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('UNIQUE (tenant_id, provider_name, dedupe_key)'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS sid'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS event_type'))).toBe(true);
  });
});
