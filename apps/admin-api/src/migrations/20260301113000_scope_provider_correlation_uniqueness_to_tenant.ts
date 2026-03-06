import { Knex } from 'knex';

const CONNECTSHYFT_SCHEMA = 'connectshyft';
const PROVIDER_IDENTIFIER_MAPPINGS_TABLE = 'cs_provider_identifier_mappings';
const WEBHOOK_RECEIPTS_TABLE = 'cs_webhook_receipts';

const PROVIDER_IDENTIFIER_UNIQUE = 'cs_provider_identifier_mappings_provider_identifier_uq';
const WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE = 'cs_webhook_receipts_provider_dedupe_uq';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          DROP CONSTRAINT IF EXISTS ${PROVIDER_IDENTIFIER_UNIQUE};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          ADD CONSTRAINT ${PROVIDER_IDENTIFIER_UNIQUE}
          UNIQUE (tenant_id, provider_name, identifier_kind, provider_identifier);
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE}
          UNIQUE (tenant_id, provider_name, dedupe_key);
      END IF;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          DROP CONSTRAINT IF EXISTS ${PROVIDER_IDENTIFIER_UNIQUE};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${PROVIDER_IDENTIFIER_MAPPINGS_TABLE}
          ADD CONSTRAINT ${PROVIDER_IDENTIFIER_UNIQUE}
          UNIQUE (provider_name, identifier_kind, provider_identifier);
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}') IS NOT NULL THEN
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          DROP CONSTRAINT IF EXISTS ${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE};
        ALTER TABLE ${CONNECTSHYFT_SCHEMA}.${WEBHOOK_RECEIPTS_TABLE}
          ADD CONSTRAINT ${WEBHOOK_RECEIPT_PROVIDER_DEDUPE_UNIQUE}
          UNIQUE (provider_name, dedupe_key);
      END IF;
    END $$;
  `);
}
