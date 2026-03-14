const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const migrationDirectory = path.join(__dirname, 'shared', 'database', 'migrations');

const resolveDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();

  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error('DATABASE_URL must be set for migration-runner');
};

const ensureSharedMigrationDirectory = () => {
  if (fs.existsSync(migrationDirectory)) {
    return;
  }

  throw new Error(
    [
      `Shared migration authority not found at ${migrationDirectory}.`,
      'migration-runner requires a flattened /app image layout with:',
      '- knexfile.js at /app/knexfile.js',
      '- shared authority at /app/shared/database/migrations'
    ].join('\n')
  );
};

const createProductionConfig = () => {
  ensureSharedMigrationDirectory();

  return {
    client: 'postgresql',
    connection: resolveDatabaseUrl(),
    pool: {
      min: 0,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: migrationDirectory,
      extension: 'ts'
    }
  };
};

module.exports = {
  production: createProductionConfig()
};
