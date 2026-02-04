import { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      database: 'moneyshyft',
      user: 'jeremiahotis',
      password: 'Oiurueu12'
    },
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
