import { Knex } from 'knex';
import knexConfig from '../knexfile';
import { createKnexClient } from '../../../../libs/db/dist/createKnexClient';

const db: Knex = createKnexClient(knexConfig, process.env.NODE_ENV || 'development');

export default db;
