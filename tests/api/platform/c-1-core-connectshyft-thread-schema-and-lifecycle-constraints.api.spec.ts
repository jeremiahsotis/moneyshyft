import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC1.fixture';

const REQUIRED_ENVELOPE_KEYS = ['ok', 'code', 'message', 'correlationId', 'tenantId'];
const resolveConnectShyftDbConnection = () => {
  const databaseUrl =
    process.env.MONEYSHYFT_TEST_DATABASE_URL
    || (process.env.CI === 'true' ? process.env.DATABASE_URL : undefined);
  if (databaseUrl) {
    return databaseUrl;
  }

  return {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    database: process.env.TEST_DB_NAME || 'moneyshyft',
    user: process.env.TEST_DB_USER || 'jeremiahotis',
    password: process.env.TEST_DB_PASSWORD || 'Oiurueu12',
  };
};

const createConnectShyftDbClient = () => {
  const knexFactory = require('../../../src/node_modules/knex');
  return knexFactory({
    client: 'postgresql',
    connection: resolveConnectShyftDbConnection(),
    pool: {
      min: 0,
      max: 2,
    },
  });
};
const connectShyftDb = createConnectShyftDbClient();

const countActiveThreadsForIdentity = async ({
  tenantId,
  orgUnitId,
  neighborId,
}: {
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
}): Promise<number> => {
  const counted = await connectShyftDb
    .withSchema('connectshyft')
    .table('cs_threads')
    .where({
      tenant_id: tenantId,
      org_unit_id: orgUnitId,
      neighbor_id: neighborId,
    })
    .andWhere('state', '<>', 'CLOSED')
    .count<{ count: string | number }>({ count: '*' })
    .first();

  return Number(counted?.count ?? 0);
};

test.describe(
  'Story c.1 automate - core ConnectShyft thread schema and lifecycle API coverage',
  () => {
    test.describe.configure({ mode: 'serial' });
    test.afterAll(async () => {
      await connectShyftDb.destroy();
    });

    test(
      '[P0] ensures thread create responses expose canonical UNCLAIMED state and required lifecycle metadata fields @P0',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1CreatePayload,
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_THREAD_ENSURED',
          data: {
            thread: {
              tenantId: storyC1Context.tenantId,
              orgUnitId: storyC1Context.orgUnitId,
              neighborId: storyC1Context.neighborId,
              state: 'UNCLAIMED',
              lastInboundCsNumberId: storyC1Context.inboundCsNumberId,
              preferredOutboundCsNumberId: storyC1Context.preferredOutboundCsNumberId,
              escalation: {
                stage: 0,
                nextEvaluationAtUtc: expect.any(String),
              },
            },
          },
        });
        expect(storyC1Context.canonicalStates).toContain(body.data.thread.state);
      },
    );

    test(
      '[P0] keeps one active thread identity for duplicate ensure attempts on the same tenant-orgUnit-neighbor tuple @P0',
      async ({
        request,
        storyC1Context,
        storyC1OperatorHeaders,
        storyC1CreatePayload,
        storyC1DuplicatePayload,
      }) => {
        const uniqueNeighborId = `${storyC1CreatePayload.neighborId}-contention-${Date.now().toString(36)}`;
        const firstEnsurePayload = {
          ...storyC1CreatePayload,
          neighborId: uniqueNeighborId,
        };
        const secondEnsurePayload = {
          ...storyC1DuplicatePayload,
          neighborId: uniqueNeighborId,
        };

        const [firstResponse, secondResponse] = await Promise.all([
          apiRequest(request, {
            method: 'POST',
            path: storyC1Context.paths.threadsCollection,
            headers: storyC1OperatorHeaders,
            data: firstEnsurePayload,
          }),
          apiRequest(request, {
            method: 'POST',
            path: storyC1Context.paths.threadsCollection,
            headers: storyC1OperatorHeaders,
            data: secondEnsurePayload,
          }),
        ]);

        expect(firstResponse.status()).toBe(201);
        expect(secondResponse.status()).toBe(201);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody.data.thread.threadId).toBe(secondBody.data.thread.threadId);
        expect(secondBody.data.thread.state).toBe('UNCLAIMED');

        const activeThreadCount = await countActiveThreadsForIdentity({
          tenantId: storyC1Context.tenantId,
          orgUnitId: storyC1Context.orgUnitId,
          neighborId: uniqueNeighborId,
        });
        expect(activeThreadCount).toBe(1);
      },
    );

    test(
      '[P0] returns due-thread scans in deterministic next_evaluation_at_utc then thread_id order for scheduler processing @P0',
      async ({ request, storyC1Context, storyC1SchedulerHeaders, storyC1DueQuery }) => {
        const response = await apiRequest(request, {
          method: 'GET',
          path: storyC1Context.paths.dueThreads + storyC1DueQuery,
          headers: storyC1SchedulerHeaders,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: true,
          code: 'CONNECTSHYFT_DUE_THREADS_LISTED',
          data: {
            threads: expect.any(Array),
          },
        });

        const threads: Array<{ threadId: string; state: string; nextEvaluationAtUtc: string }> = body.data.threads;
        const sorted = [...threads].sort((a, b) => {
          const nextEvalDiff =
            new Date(a.nextEvaluationAtUtc).getTime() -
            new Date(b.nextEvaluationAtUtc).getTime();
          return nextEvalDiff !== 0
            ? nextEvalDiff
            : a.threadId.localeCompare(b.threadId);
        });

        expect(threads).toEqual(sorted);
        for (const thread of threads) {
          expect(storyC1Context.canonicalStates).toContain(thread.state as 'UNCLAIMED' | 'CLAIMED' | 'CLOSED');
        }
      },
    );

    test(
      '[P1] rejects non-canonical forced state values with deterministic refusal envelopes and no persistence internals leakage @P1',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1InvalidStatePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1InvalidStatePayload,
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_STATE_INVALID',
          refusalType: 'business',
          message: expect.stringContaining('canonical lifecycle state'),
        });
        expect(body).not.toHaveProperty('data.sqlState');
        expect(body).not.toHaveProperty('data.constraint');
      },
    );

    test(
      '[P1] rejects client-supplied threadId to prevent caller-controlled thread identity assignment @P1',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: {
            ...storyC1CreatePayload,
            neighborId: `${storyC1CreatePayload.neighborId}-threadid-${Date.now().toString(36)}`,
            threadId: '11111111-1111-4111-8111-111111111111',
          },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_THREAD_ID_FORBIDDEN',
          refusalType: 'client',
          data: {
            fieldErrors: [
              expect.objectContaining({
                field: 'threadId',
                reason: 'FORBIDDEN',
              }),
            ],
          },
        });
        expect(body).not.toHaveProperty('data.thread');
      },
    );

    test(
      '[P1] preserves canonical envelope keys across ensure refusal and due-thread retrieval paths @P1',
      async ({
        request,
        storyC1Context,
        storyC1OperatorHeaders,
        storyC1SchedulerHeaders,
        storyC1CreatePayload,
        storyC1InvalidStatePayload,
        storyC1DueQuery,
      }) => {
        const successResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1CreatePayload,
        });
        const refusalResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: storyC1InvalidStatePayload,
        });
        const dueResponse = await apiRequest(request, {
          method: 'GET',
          path: storyC1Context.paths.dueThreads + storyC1DueQuery,
          headers: storyC1SchedulerHeaders,
        });

        expect(successResponse.status()).toBe(201);
        expect(refusalResponse.status()).toBe(200);
        expect(dueResponse.status()).toBe(200);

        const successBody = await successResponse.json();
        const refusalBody = await refusalResponse.json();
        const dueBody = await dueResponse.json();

        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(successBody, key)),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(refusalBody, key)),
        ).toBe(true);
        expect(
          REQUIRED_ENVELOPE_KEYS.every((key) => Object.prototype.hasOwnProperty.call(dueBody, key)),
        ).toBe(true);
      },
    );
  },
);
