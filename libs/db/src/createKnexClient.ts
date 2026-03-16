import knex, { Knex } from 'knex';

export type KnexEnvironmentConfig = Record<string, Knex.Config>;

export const createKnexClient = (
  knexConfig: KnexEnvironmentConfig,
  nodeEnv = process.env.NODE_ENV || 'development'
): Knex => {
  const config = knexConfig[nodeEnv];

  if (!config) {
    throw new Error(`Missing Knex configuration for environment "${nodeEnv}"`);
  }

  return knex(config);
};
