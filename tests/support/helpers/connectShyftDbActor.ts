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
let connectShyftDbDestroyed = false;

export const ensureConnectShyftDbActorUser = async (userId: string): Promise<void> => {
  const existingUser = await connectShyftDb('users')
    .where({ id: userId })
    .first<{ id: string }>('id');
  if (existingUser) {
    return;
  }

  await connectShyftDb('users')
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
};

export const destroyConnectShyftDbActorClient = async (): Promise<void> => {
  if (connectShyftDbDestroyed) {
    return;
  }

  connectShyftDbDestroyed = true;
  await connectShyftDb.destroy();
};
