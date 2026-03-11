#!/usr/bin/env node
const path = require('node:path');

require(path.resolve(__dirname, '../apps/moneyshyft-api/node_modules/ts-node')).register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
  },
});

const knexFactory = require(path.resolve(__dirname, '../apps/moneyshyft-api/node_modules/knex'));
const knexConfigModule = require(path.resolve(__dirname, '../apps/moneyshyft-api/src/knexfile.ts'));
const baseMigration = require(path.resolve(
  __dirname,
  '../apps/moneyshyft-api/src/migrations/20260217113000_create_platform_events_and_outbox.ts'
));
const repointMigration = require(path.resolve(
  __dirname,
  '../apps/moneyshyft-api/src/migrations/20260309143000_repoint_platform_tenant_foreign_keys.ts'
));

const nodeEnv = process.env.NODE_ENV || 'development';
const knexConfig = knexConfigModule.default || knexConfigModule;
const config = knexConfig[nodeEnv] || knexConfig.test || knexConfig.development;

if (!config) {
  throw new Error(`Unable to resolve Knex config for NODE_ENV='${nodeEnv}'`);
}

const knex = knexFactory(config);

const hasTable = (tableName) => knex.schema.withSchema('platform').hasTable(tableName);

(async () => {
  const [hasEvents, hasOutbox] = await Promise.all([
    hasTable('events'),
    hasTable('outbox_events'),
  ]);

  if (hasEvents && hasOutbox) {
    console.log('Platform events/outbox tables present');
    return;
  }

  console.log(
    `Repairing platform events/outbox drift (events=${hasEvents ? 'present' : 'missing'}, outbox=${hasOutbox ? 'present' : 'missing'})`
  );

  if (hasEvents || hasOutbox) {
    await baseMigration.down(knex);
  }

  await baseMigration.up(knex);
  await repointMigration.up(knex);

  console.log('Platform events/outbox tables repaired');
})()
  .catch((error) => {
    console.error('Failed to repair platform events/outbox tables:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await knex.destroy();
  });
