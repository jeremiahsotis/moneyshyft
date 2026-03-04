import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const PROVIDER_IDENTIFIER_MAPPINGS_TABLE = 'cs_provider_identifier_mappings';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';

const PROVIDER_IDENTIFIER_KIND_CHECK = 'cs_provider_identifier_mappings_kind_ck';
const PROVIDER_IDENTIFIER_UNIQUE = 'cs_provider_identifier_mappings_provider_identifier_uq';
const PROVIDER_IDENTIFIER_SCOPE_INDEX = 'connectshyft_cs_provider_identifier_mappings_scope_idx';

const WEBHOOK_RECEIPT_IDENTIFIER_KIND_CHECK = 'cs_webhook_receipts_identifier_kind_ck';
const WEBHOOK_RECEIPT_IDENTIFIER_PRESENCE_CHECK = 'cs_webhook_receipts_identifier_presence_ck';
const WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE = 'cs_webhook_receipts_provider_dedupe_uq';
const WEBHOOK_RECEIPT_SCOPE_INDEX = 'connectshyft_cs_webhook_receipts_scope_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}`);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      identifier_kind TEXT NOT NULL,
      provider_identifier TEXT NOT NULL,
      internal_reference_id TEXT NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${PROVIDER_IDENTIFIER_KIND_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          ADD CONSTRAINT ${PROVIDER_IDENTIFIER_KIND_CHECK}
          CHECK (identifier_kind IN ('call_leg', 'message'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${PROVIDER_IDENTIFIER_UNIQUE}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          ADD CONSTRAINT ${PROVIDER_IDENTIFIER_UNIQUE}
          UNIQUE (provider_name, identifier_kind, provider_identifier);
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${PROVIDER_IDENTIFIER_SCOPE_INDEX}
      ON ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE} (
        tenant_id,
        org_unit_id,
        thread_id,
        created_at_utc,
        id
      )
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE} (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      provider_event_id TEXT NULL,
      provider_identifier_kind TEXT NULL,
      provider_identifier TEXT NULL,
      canonical_event_type TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      processed_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${WEBHOOK_RECEIPT_IDENTIFIER_KIND_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_IDENTIFIER_KIND_CHECK}
          CHECK (
            provider_identifier_kind IS NULL
            OR provider_identifier_kind IN ('call_leg', 'message')
          );
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${WEBHOOK_RECEIPT_IDENTIFIER_PRESENCE_CHECK}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_IDENTIFIER_PRESENCE_CHECK}
          CHECK (
            provider_event_id IS NOT NULL
            OR provider_identifier IS NOT NULL
          );
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE}'
          AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
      ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE}
          UNIQUE (provider_name, dedupe_key);
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${WEBHOOK_RECEIPT_SCOPE_INDEX}
      ON ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE} (
        tenant_id,
        org_unit_id,
        thread_id,
        processed_at_utc,
        id
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(WEBHOOK_RECEIPTS_TABLE);
  await knex.schema.withSchema(CONNECTSHYFT_SCHEMA).dropTableIfExists(PROVIDER_IDENTIFIER_MAPPINGS_TABLE);
}
