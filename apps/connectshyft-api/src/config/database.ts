import { Pool } from 'pg';
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

// Parse DATABASE_URL or use individual env vars
const getDatabaseConfig = () => {
  validateDatabaseEnv();

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
