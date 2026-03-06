import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';
const LEGACY_DEDUPE_UNIQUE = 'cs_webhook_receipts_provider_dedupe_uq';
const REPLAY_IDENTITY_UNIQUE = 'cs_webhook_receipts_replay_identity_uq';
const RETENTION_LOOKUP_INDEX = 'connectshyft_cs_webhook_receipts_retention_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS sid TEXT;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS event_type TEXT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET
          sid = LOWER(COALESCE(NULLIF(sid, ''), provider_event_id, provider_identifier, dedupe_key)),
          event_type = LOWER(COALESCE(NULLIF(event_type, ''), canonical_event_type, 'unknown'));

        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET sid = CONCAT('dedupe:', id::text)
        WHERE sid IS NULL OR sid = '';

        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET event_type = 'unknown'
        WHERE event_type IS NULL OR event_type = '';

        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN sid SET NOT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN event_type SET NOT NULL;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${LEGACY_DEDUPE_UNIQUE};

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${REPLAY_IDENTITY_UNIQUE}'
            AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
        ) THEN
          ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
            ADD CONSTRAINT ${REPLAY_IDENTITY_UNIQUE}
            UNIQUE (tenant_id, provider_name, sid, event_type);
        END IF;
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${RETENTION_LOOKUP_INDEX}
      ON ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE} (
        tenant_id,
        org_unit_id,
        last_seen_at_utc,
        id
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${RETENTION_LOOKUP_INDEX}
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${REPLAY_IDENTITY_UNIQUE};

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${LEGACY_DEDUPE_UNIQUE}'
            AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
        ) THEN
          ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
            ADD CONSTRAINT ${LEGACY_DEDUPE_UNIQUE}
            UNIQUE (tenant_id, provider_name, dedupe_key);
        END IF;

        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS sid;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS event_type;
      END IF;
    END $$;
  `);
}
