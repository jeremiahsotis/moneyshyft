import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC1.fixture';
import { createStoryC1Headers } from '../../support/factories/connectShyftStoryC1Factory';

const CONNECTSHYFT_ENSURE_HIGH_CONTENTION_REQUESTS = 12;

const resolveConnectShyftDbConnection = () => {
  const databaseUrl =
    process.env.MONEYSHYFT_TEST_DATABASE_URL
    || process.env.DATABASE_URL;
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
  const knexFactory = require('../../../apps/moneyshyft-api/node_modules/knex');
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

const readStableThreadContract = (thread: {
  threadId: string;
  tenantId: string;
  orgUnitId: string;
  neighborId: string;
  source: string;
  state: string;
  lastInboundCsNumberId: string;
  preferredOutboundCsNumberId: string;
  escalation: {
    stage: number;
    nextEvaluationAtUtc: string | null;
  };
}) => ({
  threadId: thread.threadId,
  tenantId: thread.tenantId,
  orgUnitId: thread.orgUnitId,
  neighborId: thread.neighborId,
  source: thread.source,
  state: thread.state,
  lastInboundCsNumberId: thread.lastInboundCsNumberId,
  preferredOutboundCsNumberId: thread.preferredOutboundCsNumberId,
  escalationStage: thread.escalation.stage,
  escalationNextEvaluationAtUtc: thread.escalation.nextEvaluationAtUtc,
});

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
  'Story c.2 automate - thread ensure endpoint conflict-safe idempotency',
  () => {
    test.describe.configure({ mode: 'serial' });
    test.afterAll(async () => {
      await connectShyftDb.destroy();
    });

    test(
      '[P0] concurrent ensure requests converge to one active thread row and one thread identity @P0',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const uniqueNeighborId = `${storyC1CreatePayload.neighborId}-c2-${Date.now().toString(36)}`;
        const ensurePayload = {
          ...storyC1CreatePayload,
          neighborId: uniqueNeighborId,
        };

        const responses = await Promise.all(
          Array.from({ length: CONNECTSHYFT_ENSURE_HIGH_CONTENTION_REQUESTS }, () =>
            apiRequest(request, {
              method: 'POST',
              path: storyC1Context.paths.threadsCollection,
              headers: storyC1OperatorHeaders,
              data: ensurePayload,
            })),
        );

        responses.forEach((response) => {
          expect(response.status()).toBe(201);
        });

        const bodies = await Promise.all(responses.map((response) => response.json()));
        const resolvedThreadIds = bodies.map((body) => body.data.thread.threadId);
        const uniqueThreadIds = new Set(resolvedThreadIds);
        expect(uniqueThreadIds.size).toBe(1);

        const expectedThreadId = resolvedThreadIds[0];
        const expectedContract = readStableThreadContract(bodies[0].data.thread);
        bodies.forEach((body) => {
          expect(body).toMatchObject({
            ok: true,
            code: 'CONNECTSHYFT_THREAD_ENSURED',
            data: {
              thread: {
                threadId: expectedThreadId,
                tenantId: storyC1Context.tenantId,
                orgUnitId: storyC1Context.orgUnitId,
                neighborId: uniqueNeighborId,
                state: 'UNCLAIMED',
              },
            },
          });
          expect(readStableThreadContract(body.data.thread)).toEqual(expectedContract);
          expect(Date.parse(body.data.thread.updatedAtUtc)).toBeGreaterThanOrEqual(
            Date.parse(body.data.thread.createdAtUtc),
          );
        });

        const activeThreadCount = await countActiveThreadsForIdentity({
          tenantId: storyC1Context.tenantId,
          orgUnitId: storyC1Context.orgUnitId,
          neighborId: uniqueNeighborId,
        });
        expect(activeThreadCount).toBe(1);

        await connectShyftDb
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: storyC1Context.tenantId,
            org_unit_id: storyC1Context.orgUnitId,
            neighbor_id: uniqueNeighborId,
          })
          .del();
      },
    );

    test(
      '[P1] ensure normalizes neighborId case variants to one active thread identity @P1',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const canonicalNeighborId = `${storyC1CreatePayload.neighborId}-case-${Date.now().toString(36)}`;
        const upperCaseNeighborId = canonicalNeighborId.toUpperCase();

        const createResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: {
            ...storyC1CreatePayload,
            neighborId: upperCaseNeighborId,
          },
        });
        const reuseResponse = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: {
            ...storyC1CreatePayload,
            neighborId: canonicalNeighborId,
          },
        });

        expect(createResponse.status()).toBe(201);
        expect(reuseResponse.status()).toBe(201);

        const createBody = await createResponse.json();
        const reuseBody = await reuseResponse.json();
        expect(createBody.data.thread.threadId).toBe(reuseBody.data.thread.threadId);
        expect(createBody.data.thread.neighborId).toBe(canonicalNeighborId);
        expect(reuseBody.data.thread.neighborId).toBe(canonicalNeighborId);

        const activeThreadCount = await countActiveThreadsForIdentity({
          tenantId: storyC1Context.tenantId,
          orgUnitId: storyC1Context.orgUnitId,
          neighborId: canonicalNeighborId,
        });
        expect(activeThreadCount).toBe(1);

        const caseInsensitiveCount = await connectShyftDb
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: storyC1Context.tenantId,
            org_unit_id: storyC1Context.orgUnitId,
          })
          .whereRaw('LOWER(neighbor_id) = LOWER(?)', [canonicalNeighborId])
          .andWhere('state', '<>', 'CLOSED')
          .count<{ count: string | number }>({ count: '*' })
          .first();
        expect(Number(caseInsensitiveCount?.count ?? 0)).toBe(1);

        await connectShyftDb
          .withSchema('connectshyft')
          .table('cs_threads')
          .where({
            tenant_id: storyC1Context.tenantId,
            org_unit_id: storyC1Context.orgUnitId,
          })
          .whereRaw('LOWER(neighbor_id) = LOWER(?)', [canonicalNeighborId])
          .del();
      },
    );

    test(
      '[P1] malformed neighbor identifiers are refused with shared client-envelope semantics @P1',
      async ({ request, storyC1Context, storyC1OperatorHeaders, storyC1CreatePayload }) => {
        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: storyC1OperatorHeaders,
          data: {
            ...storyC1CreatePayload,
            neighborId: 'neighbor invalid id',
          },
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body).toMatchObject({
          ok: false,
          code: 'CONNECTSHYFT_NEIGHBOR_ID_INVALID',
          refusalType: 'client',
          data: {
            fieldErrors: [
              expect.objectContaining({
                field: 'neighborId',
                reason: 'INVALID',
              }),
            ],
          },
        });
        expect(body).not.toHaveProperty('data.threadId');
      },
    );

    test(
      '[P1] cross-tenant orgUnit overrides preserve no-leak refusal behavior for ensure attempts @P1',
      async ({ request, storyC1Context, storyC1CreatePayload }) => {
        const crossTenantHeaders = createStoryC1Headers(storyC1Context, {
          role: 'TENANT_ADMIN',
          userId: 'user-connectshyft-c2-tenant-admin',
          orgUnitId: storyC1Context.orgUnitId,
        });

        const response = await apiRequest(request, {
          method: 'POST',
          path: storyC1Context.paths.threadsCollection,
          headers: crossTenantHeaders,
          data: {
            ...storyC1CreatePayload,
            orgUnitId: 'org-connectshyft-bravo-north',
            neighborId: `neighbor-c2-cross-tenant-${Date.now().toString(36)}`,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.ok).toBe(false);
        expect(body.refusalType).toBe('business');
        expect([
          'CONNECTSHYFT_ORGUNIT_TENANT_MISMATCH',
          'CONNECTSHYFT_ORGUNIT_SCOPE_VIOLATION',
        ]).toContain(body.code);
        expect(body).not.toHaveProperty('data.thread');
        expect(body).not.toHaveProperty('data.threadId');
        expect(body).not.toHaveProperty('data.neighborId');
      },
    );
  },
);
