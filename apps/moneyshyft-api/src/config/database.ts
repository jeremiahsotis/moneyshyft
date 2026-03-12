import { Pool } from 'pg';
import os from 'os';
import logger from '../utils/logger';
import './loadEnv';

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

const getTestDatabaseConfig = () => ({
  host: '127.0.0.1',
  port: 5432,
  database: 'moneyshyft_ci',
  user: readEnv('DATABASE_USER', 'DB_USER') || process.env.USER || os.userInfo().username,
  password: readEnv('DATABASE_PASSWORD', 'DB_PASSWORD'),
});

// Parse DATABASE_URL or use individual env vars
const getDatabaseConfig = () => {
  validateDatabaseEnv();

  const testDatabaseUrl = process.env.NODE_ENV === 'test'
    ? process.env.MONEYSHYFT_TEST_DATABASE_URL?.trim()
    : undefined;
  if (testDatabaseUrl) {
    const url = new URL(testDatabaseUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
    };
  }

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: url.password,
    };
  }

  if (process.env.NODE_ENV === 'test') {
    return getTestDatabaseConfig();
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

const pool = new Pool({
  ...getDatabaseConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export default pool;
