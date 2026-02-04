require('dotenv').config();
const path = require('path');

const config = {
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
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, 'dist', 'migrations'),
      extension: 'js'  // Use compiled JavaScript files in production
    },
    seeds: {
      directory: './dist/seeds/production',
      extension: 'js'  // Use compiled JavaScript files in production
    }
  }
};

module.exports = config;
