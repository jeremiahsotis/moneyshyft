import { Knex } from 'knex';

const PEOPLE_SCHEMA = 'people';
const CONTACT_POINT_EVENTS_TABLE = 'contact_point_events';
const EVENT_TYPE_CHECK = 'people_contact_point_events_event_type_ck';
const EVENT_TYPE_VALUES = [
  'inbound_seen',
  'outbound_seen',
  'state_changed',
  'reassignment_suspected',
  'shared_detected',
  'stale_detected',
  'lifecycle_changed',
] as const;
const PREVIOUS_EVENT_TYPE_VALUES = EVENT_TYPE_VALUES.filter(
  (value) => value !== 'lifecycle_changed',
);

const eventTypeListSql = EVENT_TYPE_VALUES.map((value) => `'${value}'`).join(', ');
const previousEventTypeListSql = PREVIOUS_EVENT_TYPE_VALUES.map((value) => `'${value}'`).join(', ');

export async function up(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const hasContactPointEventsTable = await trx.schema
      .withSchema(PEOPLE_SCHEMA)
      .hasTable(CONTACT_POINT_EVENTS_TABLE);

    if (!hasContactPointEventsTable) {
      return;
    }

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE}
        DROP CONSTRAINT IF EXISTS ${EVENT_TYPE_CHECK}
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE}
        ADD CONSTRAINT ${EVENT_TYPE_CHECK}
        CHECK (event_type IN (${eventTypeListSql}))
    `);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const hasContactPointEventsTable = await trx.schema
      .withSchema(PEOPLE_SCHEMA)
      .hasTable(CONTACT_POINT_EVENTS_TABLE);

    if (!hasContactPointEventsTable) {
      return;
    }

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE}
        DROP CONSTRAINT IF EXISTS ${EVENT_TYPE_CHECK}
    `);

    await trx.raw(`
      ALTER TABLE ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE}
        ADD CONSTRAINT ${EVENT_TYPE_CHECK}
        CHECK (event_type IN (${previousEventTypeListSql}))
    `);
  });
}
