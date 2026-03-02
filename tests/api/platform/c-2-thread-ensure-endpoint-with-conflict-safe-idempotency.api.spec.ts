import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC1.fixture';
import { createStoryC1Headers } from '../../support/factories/connectShyftStoryC1Factory';

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

        const [firstResponse, secondResponse] = await Promise.all([
          apiRequest(request, {
            method: 'POST',
            path: storyC1Context.paths.threadsCollection,
            headers: storyC1OperatorHeaders,
            data: ensurePayload,
          }),
          apiRequest(request, {
            method: 'POST',
            path: storyC1Context.paths.threadsCollection,
            headers: storyC1OperatorHeaders,
            data: ensurePayload,
          }),
        ]);

        expect(firstResponse.status()).toBe(201);
        expect(secondResponse.status()).toBe(201);

        const firstBody = await firstResponse.json();
        const secondBody = await secondResponse.json();

        expect(firstBody.data.thread.threadId).toBe(secondBody.data.thread.threadId);

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
