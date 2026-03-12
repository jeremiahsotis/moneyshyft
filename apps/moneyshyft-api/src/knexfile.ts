import { Knex } from 'knex';
import os from 'os';
import './config/loadEnv';

const readEnv = (primary: string, fallback: string): string | undefined => {
  const value = process.env[primary] ?? process.env[fallback];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveRequiredEnv = (primary: string, fallback: string): string => {
  const value = readEnv(primary, fallback);
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'test') {
    if (primary === 'DATABASE_PORT') {
      return '5432';
    }
    return `test-${primary.toLowerCase()}`;
  }

  throw new Error(`${primary} (${fallback}) must be set via environment/secret manager`);
};

const validateDatabaseEnv = (): void => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
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

const resolveDbPassword = (): string => {
  const password = readEnv('DATABASE_PASSWORD', 'DB_PASSWORD');
  if (password) {
    return password;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-db-password';
  }

  throw new Error('DB_PASSWORD must be set via environment/secret manager when DATABASE_URL is not provided');
};

const buildTestConnection = (): Knex.StaticConnectionConfig => ({
  host: '127.0.0.1',
  port: 5432,
  database: 'moneyshyft_ci',
  user: readEnv('DATABASE_USER', 'DB_USER') || process.env.USER || os.userInfo().username,
  password: readEnv('DATABASE_PASSWORD', 'DB_PASSWORD'),
});

const buildNonProductionConnection = (): string | Knex.StaticConnectionConfig => {
  validateDatabaseEnv();

  const testDatabaseUrl = process.env.NODE_ENV === 'test'
    ? process.env.MONEYSHYFT_TEST_DATABASE_URL?.trim()
    : undefined;
  if (testDatabaseUrl) {
    return testDatabaseUrl;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === 'test') {
    return buildTestConnection();
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
    password: resolveDbPassword(),
  };
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: buildNonProductionConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './seeds/dev',
      extension: 'ts'
    }
  },

  test: {
    client: 'postgresql',
    connection: buildNonProductionConnection(),
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './seeds/dev',
      extension: 'ts'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || buildNonProductionConnection(),
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
      extension: 'js'  // Use compiled JavaScript files in production
    },
    seeds: {
      directory: './seeds/production',
      extension: 'js'  // Use compiled JavaScript files in production
    }
  }
};

// Use CommonJS export for Knex compatibility
// TypeScript will compile this to module.exports
export = config;
