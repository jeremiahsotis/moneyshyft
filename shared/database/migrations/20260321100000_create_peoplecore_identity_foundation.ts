import { Knex } from 'knex';

const PEOPLE_SCHEMA = 'people';
const PERSONS_TABLE = 'persons';
const HOUSEHOLDS_TABLE = 'households';
const HOUSEHOLD_MEMBERSHIPS_TABLE = 'household_memberships';
const CONTACT_POINTS_TABLE = 'contact_points';
const CONTACT_POINT_LINKS_TABLE = 'contact_point_links';
const CONTACT_POINT_EVENTS_TABLE = 'contact_point_events';
const RESOLVER_REVIEWS_TABLE = 'resolver_reviews';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${PEOPLE_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${PERSONS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      preferred_name TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active_provisional'
        CONSTRAINT people_persons_status_ck
        CHECK (status IN ('active_confirmed', 'active_provisional', 'archived', 'suppressed', 'merged')),
      merged_into_person_id UUID NULL REFERENCES ${PEOPLE_SCHEMA}.${PERSONS_TABLE}(id) ON DELETE SET NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_persons_scope_status_idx
    ON ${PEOPLE_SCHEMA}.${PERSONS_TABLE} (tenant_id, org_unit_id, status, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_persons_merged_into_idx
    ON ${PEOPLE_SCHEMA}.${PERSONS_TABLE} (merged_into_person_id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${HOUSEHOLDS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      name TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active'
        CONSTRAINT people_households_status_ck
        CHECK (status IN ('active', 'archived')),
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_households_scope_status_idx
    ON ${PEOPLE_SCHEMA}.${HOUSEHOLDS_TABLE} (tenant_id, org_unit_id, status, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${HOUSEHOLD_MEMBERSHIPS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      household_id UUID NOT NULL REFERENCES ${PEOPLE_SCHEMA}.${HOUSEHOLDS_TABLE}(id) ON DELETE CASCADE,
      person_id UUID NOT NULL REFERENCES ${PEOPLE_SCHEMA}.${PERSONS_TABLE}(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'unknown'
        CONSTRAINT people_household_memberships_role_ck
        CHECK (role IN ('head', 'member', 'unknown')),
      is_current BOOLEAN NOT NULL DEFAULT TRUE,
      start_at_utc TIMESTAMPTZ NULL,
      end_at_utc TIMESTAMPTZ NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_household_memberships_household_current_idx
    ON ${PEOPLE_SCHEMA}.${HOUSEHOLD_MEMBERSHIPS_TABLE} (household_id, is_current, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_household_memberships_person_current_idx
    ON ${PEOPLE_SCHEMA}.${HOUSEHOLD_MEMBERSHIPS_TABLE} (person_id, is_current, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      type TEXT NOT NULL
        CONSTRAINT people_contact_points_type_ck
        CHECK (type IN ('phone', 'email', 'other')),
      normalized_value TEXT NOT NULL,
      raw_value TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active_personal'
        CONSTRAINT people_contact_points_status_ck
        CHECK (status IN (
          'active_personal',
          'active_shared_possible',
          'active_shared_confirmed',
          'stale',
          'reassignment_suspected',
          'archived'
        )),
      first_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_inbound_at_utc TIMESTAMPTZ NULL,
      last_outbound_at_utc TIMESTAMPTZ NULL,
      suspected_shared BOOLEAN NOT NULL DEFAULT FALSE,
      confirmed_shared BOOLEAN NOT NULL DEFAULT FALSE,
      reassignment_suspected BOOLEAN NOT NULL DEFAULT FALSE,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS people_contact_points_tenant_type_normalized_value_uq
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE} (tenant_id, type, normalized_value)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_contact_points_status_idx
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE} (tenant_id, status, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      contact_point_id UUID NOT NULL REFERENCES ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}(id) ON DELETE CASCADE,
      subject_type TEXT NOT NULL
        CONSTRAINT people_contact_point_links_subject_type_ck
        CHECK (subject_type IN ('person', 'household')),
      subject_id UUID NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'unknown'
        CONSTRAINT people_contact_point_links_link_type_ck
        CHECK (link_type IN ('primary', 'secondary', 'historical', 'unknown')),
      confidence_band TEXT NOT NULL DEFAULT 'low'
        CONSTRAINT people_contact_point_links_confidence_band_ck
        CHECK (confidence_band IN ('very_low', 'low', 'medium', 'high', 'very_high')),
      is_current BOOLEAN NOT NULL DEFAULT TRUE,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      manually_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      confirmation_source TEXT NULL
        CONSTRAINT people_contact_point_links_confirmation_source_ck
        CHECK (confirmation_source IS NULL OR confirmation_source IN ('system', 'user', 'resolver')),
      first_linked_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_confirmed_at_utc TIMESTAMPTZ NULL,
      last_used_at_utc TIMESTAMPTZ NULL,
      linked_by TEXT NOT NULL DEFAULT 'system'
        CONSTRAINT people_contact_point_links_linked_by_ck
        CHECK (linked_by IN ('system', 'user', 'resolver')),
      linked_by_user_id TEXT NULL,
      unlink_reason TEXT NULL,
      unlinked_at_utc TIMESTAMPTZ NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_contact_point_links_contact_point_current_idx
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE} (contact_point_id, is_current, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_contact_point_links_subject_current_idx
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINT_LINKS_TABLE} (subject_type, subject_id, is_current, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      contact_point_id UUID NOT NULL REFERENCES ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL
        CONSTRAINT people_contact_point_events_event_type_ck
        CHECK (event_type IN (
          'inbound_seen',
          'outbound_seen',
          'state_changed',
          'reassignment_suspected',
          'shared_detected',
          'stale_detected'
        )),
      event_source TEXT NOT NULL,
      related_object_type TEXT NULL,
      related_object_id TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_contact_point_events_contact_point_created_idx
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE} (contact_point_id, created_at_utc, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_contact_point_events_tenant_event_idx
    ON ${PEOPLE_SCHEMA}.${CONTACT_POINT_EVENTS_TABLE} (tenant_id, event_type, created_at_utc, id)
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${PEOPLE_SCHEMA}.${RESOLVER_REVIEWS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      review_type TEXT NOT NULL
        CONSTRAINT people_resolver_reviews_review_type_ck
        CHECK (review_type IN (
          'very_high_duplicate_override',
          'shared_contact_ambiguity',
          'contact_point_reassignment',
          'merge_review',
          'subject_reassignment_review',
          'identity_conflict'
        )),
      review_status TEXT NOT NULL DEFAULT 'pending'
        CONSTRAINT people_resolver_reviews_review_status_ck
        CHECK (review_status IN (
          'pending',
          'queued',
          'in_review',
          'waiting_for_more_info',
          'resolved_confirmed_existing',
          'resolved_confirmed_new',
          'resolved_shared_contact',
          'resolved_reassigned',
          'resolved_merged',
          'dismissed'
        )),
      priority TEXT NOT NULL DEFAULT 'normal'
        CONSTRAINT people_resolver_reviews_priority_ck
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      trigger_source_type TEXT NOT NULL,
      trigger_source_id TEXT NOT NULL,
      conversation_id TEXT NULL,
      provisional_person_id UUID NULL REFERENCES ${PEOPLE_SCHEMA}.${PERSONS_TABLE}(id) ON DELETE SET NULL,
      candidate_person_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      contact_point_id UUID NULL REFERENCES ${PEOPLE_SCHEMA}.${CONTACT_POINTS_TABLE}(id) ON DELETE SET NULL,
      confidence_band TEXT NOT NULL DEFAULT 'low'
        CONSTRAINT people_resolver_reviews_confidence_band_ck
        CHECK (confidence_band IN ('very_low', 'low', 'medium', 'high', 'very_high')),
      confidence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
      risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
      requested_by_user_id TEXT NOT NULL,
      assigned_resolver_user_id TEXT NULL,
      requested_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at_utc TIMESTAMPTZ NULL,
      resolved_at_utc TIMESTAMPTZ NULL,
      resolution_type TEXT NULL
        CONSTRAINT people_resolver_reviews_resolution_type_ck
        CHECK (resolution_type IS NULL OR resolution_type IN (
          'confirm_existing_person',
          'confirm_new_person',
          'mark_shared_contact',
          'reassign_contact_point',
          'merge_people',
          'link_without_merge',
          'dismiss_no_action'
        )),
      resolution_reason TEXT NULL,
      resolution_notes TEXT NULL
    )
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_resolver_reviews_scope_status_idx
    ON ${PEOPLE_SCHEMA}.${RESOLVER_REVIEWS_TABLE} (tenant_id, org_unit_id, review_status, id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_resolver_reviews_contact_point_idx
    ON ${PEOPLE_SCHEMA}.${RESOLVER_REVIEWS_TABLE} (contact_point_id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS people_resolver_reviews_provisional_person_idx
    ON ${PEOPLE_SCHEMA}.${RESOLVER_REVIEWS_TABLE} (provisional_person_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(RESOLVER_REVIEWS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(CONTACT_POINT_EVENTS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(CONTACT_POINT_LINKS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(HOUSEHOLD_MEMBERSHIPS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(CONTACT_POINTS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(HOUSEHOLDS_TABLE);
  await knex.schema.withSchema(PEOPLE_SCHEMA).dropTableIfExists(PERSONS_TABLE);
}
