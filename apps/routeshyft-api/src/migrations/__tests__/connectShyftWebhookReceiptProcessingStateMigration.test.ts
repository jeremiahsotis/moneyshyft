import { down, up } from '../20260303153000_add_connectshyft_webhook_receipt_processing_state';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260303153000_add_connectshyft_webhook_receipt_processing_state migration', () => {
  it('adds webhook receipt processing-state columns and guardrails idempotently', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT \'RECEIVED\''))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS first_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS last_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS correlation_keys JSONB NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('cs_webhook_receipts_processing_status_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('connectshyft_cs_webhook_receipts_processing_status_idx'))).toBe(true);
  });

  it('removes processing-state columns and constraints in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('DROP CONSTRAINT IF EXISTS cs_webhook_receipts_processing_status_ck'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP INDEX IF EXISTS connectshyft.connectshyft_cs_webhook_receipts_processing_status_idx'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS failure_reason'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS processing_status'))).toBe(true);
  });
});
