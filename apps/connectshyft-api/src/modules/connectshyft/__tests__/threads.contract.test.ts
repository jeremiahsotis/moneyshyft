import knex, { Knex } from 'knex';
import { up as migrateThreadsUp } from '../../../migrations/20260224170000_create_connectshyft_threads';
import { up as migrateThreadPersonIdentityUp } from '../../../migrations/20260323180000_add_connectshyft_thread_person_identity';
import { AsyncConnectShyftThreadService, KnexConnectShyftThreadStore } from '../threads';
import { resolveSenderNumber } from '../senderNumberResolver';

const DATABASE_URL = process.env.MONEYSHYFT_TEST_DATABASE_URL;
const shouldRun = Boolean(DATABASE_URL);
const describeIfDb = shouldRun ? describe : describe.skip;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTRACT_TENANT_PREFIX = 'tenant-contract-c1-';

async function ensurePerson(db: Knex, personId: string): Promise<void> {
  await db
    .withSchema('people')
    .table('persons')
    .insert({ id: personId })
    .onConflict('id')
    .ignore();
}

describeIfDb('connectshyft threads (postgres contract)', () => {
  let db: Knex;

  beforeAll(async () => {
    db = knex({
      client: 'pg',
      connection: DATABASE_URL,
    });

    await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await db.raw('CREATE SCHEMA IF NOT EXISTS people');
    await db.raw('CREATE TABLE IF NOT EXISTS people.persons (id UUID PRIMARY KEY)');

    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.uuid('id').primary();
      });
    }

    await migrateThreadsUp(db);
    await migrateThreadPersonIdentityUp(db);
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
    const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    const seededThreadId = '11111111-1111-4111-8111-111111111111';

    await ensurePerson(db, personId);

    const tx = await db.transaction();
    await tx
      .withSchema('connectshyft')
      .table('cs_threads')
      .insert({
        id: seededThreadId,
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
        person_id: personId,
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
      personId,
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
    expect(result.thread.personId).toBe(personId);
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
    const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

    await ensurePerson(db, personId);

    await expect(
      db.withSchema('connectshyft').table('cs_threads').insert({
        id: '22222222-2222-4222-8222-222222222222',
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
        person_id: personId,
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

  it('persists ensure metadata when actor id is non-uuid without writing invalid audit UUIDs', async () => {
    const store = new KnexConnectShyftThreadStore(db);
    const tenantId = `${CONTRACT_TENANT_PREFIX}actor-id`;
    const orgUnitId = 'org-contract-c1-actor-id';
    const neighborId = 'neighbor-contract-c1-actor-id';
    const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
    const threadId = '44444444-4444-4444-8444-444444444444';

    await ensurePerson(db, personId);

    const result = await store.ensureActiveThread({
      tenantId,
      orgUnitId,
      neighborId,
      personId,
      source: 'VOICE',
      state: 'UNCLAIMED',
      threadId,
      actorUserId: 'user-connectshyft-c1-operator',
      lastInboundCsNumberId: 'cs-inbound-actor-id',
      preferredOutboundCsNumberId: 'cs-outbound-actor-id',
      nextEvaluationAtUtc: '2026-02-24T14:30:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ensureActiveThread with non-uuid actor to succeed');
    }

    expect(result.thread.threadId).toBe(threadId);
    expect(result.thread.personId).toBe(personId);
    expect(result.thread.escalation.nextEvaluationAtUtc).toBe('2026-02-24T14:30:00.000Z');

    const persisted = await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: tenantId,
        id: threadId,
      })
      .first<{ created_by_user_id: string | null; updated_by_user_id: string | null; person_id: string }>(
        'created_by_user_id',
        'updated_by_user_id',
        'person_id',
      );

    expect(persisted).toBeDefined();
    expect(persisted?.created_by_user_id ?? null).toBeNull();
    expect(persisted?.updated_by_user_id ?? null).toBeNull();
    expect(persisted?.person_id).toBe(personId);
  });

  it('normalizes non-uuid threadId hints to canonical UUID thread ids', async () => {
    const store = new KnexConnectShyftThreadStore(db);
    const tenantId = `${CONTRACT_TENANT_PREFIX}thread-id`;
    const orgUnitId = 'org-contract-c1-thread-id';
    const neighborId = 'neighbor-contract-c1-thread-id';
    const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    const hintedThreadId = 'thread-a5-2001';

    await ensurePerson(db, personId);

    const result = await store.ensureActiveThread({
      tenantId,
      orgUnitId,
      neighborId,
      personId,
      source: 'VOICE',
      state: 'UNCLAIMED',
      threadId: hintedThreadId,
      lastInboundCsNumberId: 'cs-inbound-thread-id',
      preferredOutboundCsNumberId: 'cs-outbound-thread-id',
      nextEvaluationAtUtc: '2026-02-24T15:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ensureActiveThread with non-uuid threadId hint to succeed');
    }

    expect(result.thread.threadId).not.toBe(hintedThreadId);
    expect(result.thread.threadId).toMatch(UUID_PATTERN);
    expect(result.thread.personId).toBe(personId);

    const persisted = await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborId,
      })
      .first<{ id: string; person_id: string }>('id', 'person_id');

    expect(persisted?.id).toBe(result.thread.threadId);
    expect(persisted?.person_id).toBe(personId);
  });

  it('persists provider-number sender alignment without synthetic rewriting', async () => {
    const store = new KnexConnectShyftThreadStore(db);
    const tenantId = `${CONTRACT_TENANT_PREFIX}provider-alignment`;
    const orgUnitId = 'org-contract-c1-provider-alignment';
    const neighborId = 'neighbor-contract-c1-provider-alignment';
    const personId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
    const threadId = '55555555-5555-4555-8555-555555555555';

    await ensurePerson(db, personId);

    const result = await store.ensureActiveThread({
      tenantId,
      orgUnitId,
      neighborId,
      personId,
      source: 'SMS',
      state: 'UNCLAIMED',
      threadId,
      lastInboundCsNumberId: '  +12605550191  ',
      preferredOutboundCsNumberId: '  +12605550191  ',
      nextEvaluationAtUtc: '2026-02-24T16:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected ensureActiveThread with provider-number alignment to succeed');
    }

    expect(result.thread.lastInboundCsNumberId).toBe('+12605550191');
    expect(result.thread.preferredOutboundCsNumberId).toBe('+12605550191');

    const reloaded = await store.findThreadById({
      tenantId,
      threadId,
    });
    expect(reloaded).toMatchObject({
      threadId,
      lastInboundCsNumberId: '+12605550191',
      preferredOutboundCsNumberId: '+12605550191',
    });
  });

  it('lets resolver reuse stored provider-number alignment and refuse legacy synthetic tokens', async () => {
    const store = new KnexConnectShyftThreadStore(db);
    const tenantId = `${CONTRACT_TENANT_PREFIX}resolver-alignment`;
    const orgUnitId = 'org-contract-c1-resolver-alignment';
    const alignedPersonId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
    const legacyPersonId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';

    await ensurePerson(db, alignedPersonId);
    await ensurePerson(db, legacyPersonId);

    const aligned = await store.ensureActiveThread({
      tenantId,
      orgUnitId,
      neighborId: 'neighbor-contract-c1-resolver-alignment',
      personId: alignedPersonId,
      source: 'SMS',
      state: 'UNCLAIMED',
      threadId: '66666666-6666-4666-8666-666666666666',
      lastInboundCsNumberId: '+12605550192',
      preferredOutboundCsNumberId: '+12605550192',
      nextEvaluationAtUtc: '2026-02-24T16:30:00.000Z',
    });
    expect(aligned.ok).toBe(true);
    if (!aligned.ok) {
      throw new Error('Expected aligned ensureActiveThread call to succeed');
    }

    const resolved = await resolveSenderNumber(
      {
        tenantId,
        orgUnitId,
        threadId: aligned.thread.threadId,
        channel: 'sms',
      },
      {
        loadThread: async (request) => store.findThreadById({
          tenantId: request.tenantId,
          threadId: request.threadId,
        }),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({
            status: 'found',
            mapping: {
              mappingId: 'mapping-contract-c1-001',
              tenantId,
              orgUnitId,
              twilioNumberE164: '+12605550192',
              label: 'Contract Primary',
              isActive: true,
              createdAtUtc: '2026-03-19T12:00:00.000Z',
              updatedAtUtc: '2026-03-19T12:00:00.000Z',
            },
          }),
        },
      },
    );
    expect(resolved).toMatchObject({
      ok: true,
      providerNumberE164: '+12605550192',
      mappingId: 'mapping-contract-c1-001',
    });

    const legacy = await store.ensureActiveThread({
      tenantId: `${CONTRACT_TENANT_PREFIX}resolver-legacy`,
      orgUnitId,
      neighborId: 'neighbor-contract-c1-resolver-legacy',
      personId: legacyPersonId,
      source: 'SMS',
      state: 'UNCLAIMED',
      threadId: '77777777-7777-4777-8777-777777777777',
      lastInboundCsNumberId: 'cs-number-contract-legacy-501',
      preferredOutboundCsNumberId: 'cs-number-contract-legacy-501',
      nextEvaluationAtUtc: '2026-02-24T17:00:00.000Z',
    });
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) {
      throw new Error('Expected legacy ensureActiveThread call to succeed');
    }

    const refused = await resolveSenderNumber(
      {
        tenantId: `${CONTRACT_TENANT_PREFIX}resolver-legacy`,
        orgUnitId,
        threadId: legacy.thread.threadId,
        channel: 'sms',
      },
      {
        loadThread: async (request) => store.findThreadById({
          tenantId: request.tenantId,
          threadId: request.threadId,
        }),
        numberMappingService: {
          resolveRoutingMappingByNumber: async () => ({ status: 'not-found' }),
        },
      },
    );
    expect(refused).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_SENDER_ALIGNMENT_INVALID',
      reason: 'sender_alignment_invalid',
    });
  });

  it('maintains an index-backed due-thread scan contract', async () => {
    const tenantId = `${CONTRACT_TENANT_PREFIX}index`;
    const orgUnitId = 'org-contract-c1-index';
    const neighborA = 'neighbor-contract-c1-index-a';
    const neighborB = 'neighbor-contract-c1-index-b';
    const personA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8';
    const personB = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9';

    await ensurePerson(db, personA);
    await ensurePerson(db, personB);

    await db.withSchema('connectshyft').table('cs_threads').insert([
      {
        id: '33333333-3333-4333-8333-333333333331',
        tenant_id: tenantId,
        org_unit_id: orgUnitId,
        neighbor_id: neighborA,
        person_id: personA,
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
        person_id: personB,
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
    await db.raw('SET enable_sort = off');
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
      await db.raw('RESET enable_sort');
      await db.raw('RESET enable_seqscan');
    }
  });

  it('refuses ensureThread when personId is blank before persistence', async () => {
    const tenantId = `${CONTRACT_TENANT_PREFIX}person-required`;
    const service = new AsyncConnectShyftThreadService(new KnexConnectShyftThreadStore(db));

    const result = await service.ensureThread({
      actorRoles: ['ORGUNIT_MEMBER'],
      tenantId,
      orgUnitId: 'org-contract-c1-person-required',
      neighborId: 'neighbor-contract-c1-person-required',
      personId: '   ',
      source: 'SMS',
      lastInboundCsNumberId: 'cs-inbound-person-required',
      preferredOutboundCsNumberId: 'cs-outbound-person-required',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CONNECTSHYFT_THREAD_PERSON_REQUIRED',
      message: 'ConnectShyft thread persistence requires personId.',
    });

    const persistedRows = await db
      .withSchema('connectshyft')
      .table('cs_threads')
      .where({ tenant_id: tenantId })
      .count<{ count: string }[]>('* as count');

    expect(Number(persistedRows[0]?.count ?? 0)).toBe(0);
  });
});
