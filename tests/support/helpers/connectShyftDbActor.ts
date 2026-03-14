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
      max: 10,
    },
  });
};

const connectShyftDb = createConnectShyftDbClient();
let connectShyftDbDestroyed = false;

const buildInvitationCode = (tenantId: string): string =>
  tenantId.replace(/-/g, '').slice(0, 10).toUpperCase();

const normalizeIds = (values: string[] | undefined): string[] =>
  Array.from(
    new Set(
      (values ?? [])
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0),
    ),
  );

const withEphemeralConnectShyftDbClient = async <T>(
  operation: (db: ReturnType<typeof createConnectShyftDbClient>) => Promise<T>,
): Promise<T> => {
  const db = createConnectShyftDbClient();
  try {
    return await operation(db);
  } finally {
    await db.destroy();
  }
};

export const ensureConnectShyftDbActorUser = async (userId: string): Promise<void> => {
  await withEphemeralConnectShyftDbClient(async (db) => {
    const existingUser = await db('users')
      .where({ id: userId })
      .first<{ id: string }>('id');
    if (existingUser) {
      return;
    }

    await db('users')
      .insert({
        id: userId,
        email: `connectshyft-actor-${userId}@example.test`,
        password_hash: 'test-password-hash',
        first_name: 'ConnectShyft',
        last_name: 'Actor',
        role: 'member',
      })
      .onConflict('id')
      .ignore();
  });
};

export const ensureConnectShyftDbHousehold = async (tenantId: string): Promise<void> => {
  await withEphemeralConnectShyftDbClient(async (db) => {
    const defaultHouseholdName = `ConnectShyft ${tenantId.slice(0, 8)}`;
    const existingHousehold = await db('households')
      .where({ id: tenantId })
      .first<{ id: string; name: string }>('id', 'name');

    const householdName = existingHousehold?.name || defaultHouseholdName;

    if (!existingHousehold) {
      await db('households')
        .insert({
          id: tenantId,
          name: householdName,
          invitation_code: buildInvitationCode(tenantId),
        })
        .onConflict('id')
        .ignore();
    }

    await db.withSchema('platform').table('tenants')
      .insert({
        id: tenantId,
        name: householdName,
        status: 'active',
      })
      .onConflict('id')
      .ignore();
  });
};

export const cleanupConnectShyftThreadAndNeighborState = async (input: {
  tenantId: string;
  threadIds?: string[];
  neighborIds?: string[];
}): Promise<void> => {
  const threadIds = normalizeIds(input.threadIds);
  const neighborIds = normalizeIds(input.neighborIds);

  if (threadIds.length === 0 && neighborIds.length === 0) {
    return;
  }

  try {
    const threadsTable = connectShyftDb.withSchema('connectshyft').table('cs_threads');
    const neighborsTable = connectShyftDb.withSchema('connectshyft').table('cs_neighbors');

    if (threadIds.length > 0) {
      await threadsTable
        .clone()
        .where({ tenant_id: input.tenantId })
        .whereIn('id', threadIds)
        .del();
    }

    if (neighborIds.length > 0) {
      await threadsTable
        .clone()
        .where({ tenant_id: input.tenantId })
        .whereIn('neighbor_id', neighborIds)
        .del();

      await neighborsTable
        .clone()
        .where({ tenant_id: input.tenantId })
        .whereIn('id', neighborIds)
        .del();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Unable to acquire a connection')) {
      return;
    }

    throw error;
  }
};

export const destroyConnectShyftDbActorClient = async (): Promise<void> => {
  if (connectShyftDbDestroyed) {
    return;
  }

  connectShyftDbDestroyed = true;
  await connectShyftDb.destroy();
};
