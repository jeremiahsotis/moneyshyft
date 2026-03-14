const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const readEnv = (primary, fallback) => {
  const value = process.env[primary] ?? process.env[fallback];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveRequiredEnv = (primary, fallback) => {
  const value = readEnv(primary, fallback);
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'test') {
    return `test-${primary.toLowerCase()}`;
  }

  throw new Error(`${primary} (${fallback}) must be set via environment/secret manager`);
};

const blockLaneProdMigrationExecution = (serviceName) => {
  const commandLine = process.argv.join(' ');
  const isKnexInvocation = commandLine.includes('knex');
  const isMigrationOrSeed = commandLine.includes('migrate:') || commandLine.includes('seed:');

  if (process.env.NODE_ENV === 'production' && isKnexInvocation && isMigrationOrSeed) {
    throw new Error(`${serviceName} is not authorized to execute production migrations or seeds`);
  }
};

const validateDatabaseEnv = () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
  if (databaseUrl) {
    return;
  }

  resolveRequiredEnv('DATABASE_HOST', 'DB_HOST');
  resolveRequiredEnv('DATABASE_PORT', 'DB_PORT');
  resolveRequiredEnv('DATABASE_NAME', 'DB_NAME');
  resolveRequiredEnv('DATABASE_USER', 'DB_USER');
  resolveRequiredEnv('DATABASE_PASSWORD', 'DB_PASSWORD');

  if (process.env.NODE_ENV === 'production') {
    resolveRequiredEnv('DATABASE_SSL_MODE', 'DB_SSL_MODE');
  }
};

const buildConnection = () => {
  validateDatabaseEnv();

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const portValue = resolveRequiredEnv('DATABASE_PORT', 'DB_PORT');
  const parsedPort = parseInt(portValue, 10);
  if (Number.isNaN(parsedPort)) {
    throw new Error(`DATABASE_PORT must be numeric, received '${portValue}'`);
  }

  return {
    host: resolveRequiredEnv('DATABASE_HOST', 'DB_HOST'),
    port: parsedPort,
    database: resolveRequiredEnv('DATABASE_NAME', 'DB_NAME'),
    user: resolveRequiredEnv('DATABASE_USER', 'DB_USER'),
    password: resolveRequiredEnv('DATABASE_PASSWORD', 'DB_PASSWORD')
  };
};

blockLaneProdMigrationExecution('connect-api');

module.exports = {
  development: {
    client: 'postgresql',
    connection: buildConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/seeds/dev',
      extension: 'ts'
    }
  },

  production: {
    client: 'postgresql',
    connection: buildConnection(),
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'dist', 'migrations'),
      extension: 'js'
    },
    seeds: {
      directory: './dist/seeds/production',
      extension: 'js'
    }
  }
};
