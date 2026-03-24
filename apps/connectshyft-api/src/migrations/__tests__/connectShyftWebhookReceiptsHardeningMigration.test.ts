import { down, up } from '../20260325104000_harden_connectshyft_webhook_receipts';

function buildKnexMock() {
  const knex: any = {
    raw: jest.fn(async () => undefined),
  };

  return { knex };
}

describe('20260325104000_harden_connectshyft_webhook_receipts migration', () => {
  it('adds payload hash and error detail fields while relaxing processed-at semantics', async () => {
    const { knex } = buildKnexMock();

    await up(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS payload_hash TEXT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS error_code TEXT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ADD COLUMN IF NOT EXISTS error_message TEXT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN processed_at_utc DROP NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN processed_at_utc DROP DEFAULT'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('PROCESSING'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('IGNORED_DUPLICATE'))).toBe(true);
  });

  it('restores legacy processing statuses and removes hardening fields in down migration', async () => {
    const { knex } = buildKnexMock();

    await down(knex);

    const rawCalls = knex.raw.mock.calls.map((call: [string]) => call[0]);
    expect(rawCalls.some((sql: string) => sql.includes("processing_status = 'PROCESSING' THEN 'RECEIVED'"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes("processing_status = 'IGNORED_DUPLICATE' THEN 'APPLIED'"))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN processed_at_utc SET DEFAULT NOW()'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('ALTER COLUMN processed_at_utc SET NOT NULL'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS error_message'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS error_code'))).toBe(true);
    expect(rawCalls.some((sql: string) => sql.includes('DROP COLUMN IF EXISTS payload_hash'))).toBe(true);
  });
});
