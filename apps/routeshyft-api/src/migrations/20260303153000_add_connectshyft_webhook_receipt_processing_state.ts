import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';
const WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK = 'cs_webhook_receipts_processing_status_ck';
const WEBHOOK_RECEIPT_PROCESSING_STATUS_INDEX = 'connectshyft_cs_webhook_receipts_processing_status_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'RECEIVED';
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS first_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS last_seen_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW();
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS correlation_keys JSONB NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET
          first_seen_at_utc = COALESCE(first_seen_at_utc, processed_at_utc, NOW()),
          last_seen_at_utc = COALESCE(last_seen_at_utc, processed_at_utc, NOW()),
          attempt_count = GREATEST(COALESCE(attempt_count, 1), 1),
          processing_status = CASE
            WHEN processing_status IN ('RECEIVED', 'APPLIED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL')
              THEN processing_status
            ELSE 'APPLIED'
          END;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK}'
            AND conrelid = '${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}'::regclass
        ) THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK}
          CHECK (processing_status IN ('RECEIVED', 'APPLIED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL'));
      END IF;
    END $$;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS ${WEBHOOK_RECEIPT_PROCESSING_STATUS_INDEX}
      ON ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE} (
        tenant_id,
        provider_name,
        processing_status,
        last_seen_at_utc,
        id
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK};
      END IF;
    END $$;
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPT_PROCESSING_STATUS_INDEX}
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS failure_reason;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS correlation_keys;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS attempt_count;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS last_seen_at_utc;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS first_seen_at_utc;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS processing_status;
      END IF;
    END $$;
  `);
}
