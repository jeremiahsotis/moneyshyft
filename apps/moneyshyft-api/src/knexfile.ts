import { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const resolveDbPassword = (): string => {
  const password = process.env.DB_PASSWORD;
  if (typeof password === 'string' && password.trim().length > 0) {
    return password;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-db-password';
  }

  throw new Error('DB_PASSWORD must be set via environment/secret manager when DATABASE_URL is not provided');
};

const buildNonProductionConnection = (): string | Knex.StaticConnectionConfig => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'moneyshyft',
    user: process.env.DB_USER || 'jeremiahotis',
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
    connection: process.env.DATABASE_URL,
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
