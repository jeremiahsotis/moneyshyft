/**
 * This helper executes knex migrations after loading the migration-runner
 * local env file. It preserves strict production behaviour by requiring
 * DATABASE_URL while still letting local development provide it via
 * apps/migration-runner/.env.
 */
const { execSync } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const action = typeof process.argv[2] === 'string' && process.argv[2].trim()
  ? process.argv[2].trim()
  : 'migrate:latest';

const commandByAction = {
  'migrate:latest': 'node ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:latest',
  'migrate:rollback': 'node ./node_modules/knex/bin/cli.js --knexfile knexfile.js --env production migrate:rollback',
};

if (!commandByAction[action]) {
  throw new Error(`migration-runner: unsupported action "${action}"`);
}

const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
if (!databaseUrl) {
  throw new Error(
    'migration-runner: DATABASE_URL must be set via environment or apps/migration-runner/.env',
  );
}

execSync(commandByAction[action], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
});
