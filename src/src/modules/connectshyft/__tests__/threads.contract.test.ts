import knex, { Knex } from 'knex';
import { up as migrateThreadsUp } from '../../../migrations/20260224170000_create_connectshyft_threads';
import { KnexConnectShyftThreadStore } from '../threads';

const DATABASE_URL = process.env.MONEYSHYFT_TEST_DATABASE_URL;
const shouldRun = Boolean(DATABASE_URL);
const describeIfDb = shouldRun ? describe : describe.skip;

const CONTRACT_TENANT_PREFIX = 'tenant-contract-c1-';

describeIfDb('connectshyft threads (postgres contract)', () => {
  let db: Knex;

  beforeAll(async () => {
    db = knex({
      client: 'pg',
      connection: DATABASE_URL,
    });

    await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.uuid('id').primary();
      });
    }

    await migrateThreadsUp(db);
  });

  afterEach(async () => {
    await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where('tenant_id', 'like', `${CONTRACT_TENANT_PREFIX}%`)
      .del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('enforces single-active-thread identity under write races and preserves latest ensure metadata', async () => {
    const store = new KnexConnectShyftThreadStore(db);
    const tenantId = `${CONTRACT_TENANT_PREFIX}race`;
    const orgUnitId = 'org-contract-c1-race';
    const neighborId = 'neighbor-contract-c1-race';
    const seededThreadId = '11111111-1111-4111-8111-111111111111';

    const tx = await db.transaction();
    await tx
      .withSchema('connectshyft')
      .table('cs_threads')
      .insert({
        id: seededThreadId,
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
        source: 'VOICE',
        state: 'UNCLAIMED',
        escalation_stage: 0,
        next_evaluation_at_utc: '2026-02-24T12:00:00.000Z',
        last_inbound_cs_number_id: 'cs-inbound-seeded',
        preferred_outbound_cs_number_id: 'cs-outbound-seeded',
      });

    const ensurePromise = store.ensureActiveThread({
      tenantId,
      orgUnitId,
      neighborId,
      source: 'SMS',
      state: 'UNCLAIMED',
      lastInboundCsNumberId: 'cs-inbound-updated',
      preferredOutboundCsNumberId: 'cs-outbound-updated',
      nextEvaluationAtUtc: '2026-02-24T13:15:00.000Z',
    });

    await new Promise((resolve) => setTimeout(resolve, 75));
    await tx.commit();

    const result = await ensurePromise;
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ensureActiveThread race call to succeed');
    }

    expect(result.thread.threadId).toBe(seededThreadId);
    expect(result.thread.source).toBe('SMS');
    expect(result.thread.lastInboundCsNumberId).toBe('cs-inbound-updated');
    expect(result.thread.preferredOutboundCsNumberId).toBe('cs-outbound-updated');
    expect(result.thread.escalation.nextEvaluationAtUtc).toBe('2026-02-24T13:15:00.000Z');

    const activeRows = await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
      })
      .whereNot('state', 'CLOSED')
      .select('id');

    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].id).toBe(seededThreadId);
  });

  it('supports nullable next_evaluation_at_utc for non-due lifecycle states', async () => {
    const tenantId = `${CONTRACT_TENANT_PREFIX}nullable-due`;
    const orgUnitId = 'org-contract-c1-nullable-due';
    const neighborId = 'neighbor-contract-c1-nullable-due';

    await expect(
      db.withSchema('connectshyft').table('cs_threads').insert({
        id: '22222222-2222-4222-8222-222222222222',
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
        source: 'VOICE',
        state: 'CLAIMED',
        escalation_stage: 0,
        next_evaluation_at_utc: null,
        claimed_by_user_id: null,
        claimed_at_utc: null,
        last_inbound_cs_number_id: 'cs-inbound-nullable',
        preferred_outbound_cs_number_id: 'cs-outbound-nullable',
      })
    ).resolves.toBeDefined();
  });

  it('maintains an index-backed due-thread scan contract', async () => {
    const tenantId = `${CONTRACT_TENANT_PREFIX}index`;
    const orgUnitId = 'org-contract-c1-index';
    const neighborA = 'neighbor-contract-c1-index-a';
    const neighborB = 'neighbor-contract-c1-index-b';

    await db.withSchema('connectshyft').table('cs_threads').insert([
      {
        id: '33333333-3333-4333-8333-333333333331',
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborA,
        source: 'VOICE',
        state: 'UNCLAIMED',
        escalation_stage: 0,
        next_evaluation_at_utc: '2026-02-24T10:00:00.000Z',
        last_inbound_cs_number_id: 'cs-inbound-index-a',
        preferred_outbound_cs_number_id: 'cs-outbound-index-a',
      },
      {
        id: '33333333-3333-4333-8333-333333333332',
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborB,
        source: 'SMS',
        state: 'CLAIMED',
        escalation_stage: 0,
        next_evaluation_at_utc: null,
        claimed_by_user_id: null,
        claimed_at_utc: null,
        last_inbound_cs_number_id: 'cs-inbound-index-b',
        preferred_outbound_cs_number_id: 'cs-outbound-index-b',
      },
    ]);

    await db.raw('SET enable_seqscan = off');
    try {
      const explained = await db.raw(
        `EXPLAIN SELECT id
         FROM connectshyft.cs_threads
         WHERE tenant_id = ?
           AND org_unit_id = ?
           AND state <> 'CLOSED'
           AND next_evaluation_at_utc IS NOT NULL
         ORDER BY next_evaluation_at_utc ASC, id ASC
         LIMIT 50`,
        [tenantId, orgUnitId]
      );

      const planText = (explained.rows as Array<Record<string, string>>)
        .map((row) => row['QUERY PLAN'] || row.query_plan)
        .join('\n');

      expect(planText).toContain('cs_threads_due_eval_idx');
    } finally {
      await db.raw('RESET enable_seqscan');
    }
  });
});
