import { apiRequest } from '../../support/helpers/apiClient';
import { test, expect } from '../../support/fixtures/connectShyftStoryC1.fixture';

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
      },
    );
  },
);
