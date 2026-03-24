import type { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';
const WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK = 'cs_webhook_receipts_processing_status_ck';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS payload_hash TEXT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS error_code TEXT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD COLUMN IF NOT EXISTS error_message TEXT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN processed_at_utc DROP NOT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN processed_at_utc DROP DEFAULT;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET
          processing_status = CASE
            WHEN processing_status IN (
              'RECEIVED',
              'PROCESSING',
              'APPLIED',
              'IGNORED_DUPLICATE',
              'FAILED_RETRYABLE',
              'FAILED_TERMINAL'
            ) THEN processing_status
            WHEN processing_status = 'APPLIED' THEN 'APPLIED'
            ELSE 'RECEIVED'
          END,
          error_code = COALESCE(error_code, NULLIF(failure_reason, '')),
          error_message = COALESCE(error_message, NULLIF(failure_reason, '')),
          processed_at_utc = CASE
            WHEN processing_status IN ('APPLIED', 'IGNORED_DUPLICATE')
              THEN COALESCE(processed_at_utc, last_seen_at_utc, first_seen_at_utc, NOW())
            ELSE NULL
          END;
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK}
          CHECK (
            processing_status IN (
              'RECEIVED',
              'PROCESSING',
              'APPLIED',
              'IGNORED_DUPLICATE',
              'FAILED_RETRYABLE',
              'FAILED_TERMINAL'
            )
          );
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        UPDATE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
        SET
          processing_status = CASE
            WHEN processing_status = 'PROCESSING' THEN 'RECEIVED'
            WHEN processing_status = 'IGNORED_DUPLICATE' THEN 'APPLIED'
            ELSE processing_status
          END,
          processed_at_utc = COALESCE(processed_at_utc, last_seen_at_utc, first_seen_at_utc, NOW());

        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROCESSING_STATUS_CHECK}
          CHECK (processing_status IN ('RECEIVED', 'APPLIED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL'));
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN processed_at_utc SET DEFAULT NOW();
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ALTER COLUMN processed_at_utc SET NOT NULL;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS error_message;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS error_code;
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP COLUMN IF EXISTS payload_hash;
      END IF;
    END $$;
  `);
}
