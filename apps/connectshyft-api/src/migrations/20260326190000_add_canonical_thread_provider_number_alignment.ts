import { Knex } from 'knex';

const THREADS_TABLE = 'cs_threads';
const LAST_INBOUND_PROVIDER_COLUMN = 'last_inbound_provider_number_e164';
const PREFERRED_OUTBOUND_PROVIDER_COLUMN = 'preferred_outbound_provider_number_e164';
const LAST_INBOUND_PROVIDER_CHECK = 'cs_threads_last_inbound_provider_number_e164_ck';
const PREFERRED_OUTBOUND_PROVIDER_CHECK = 'cs_threads_preferred_outbound_provider_number_e164_ck';
const E164_PATTERN = '^\\+[1-9][0-9]{1,14}$';
const LEGACY_SENTINEL_PATTERN = '^cs-number(?:-[a-z0-9]+)*-[0-9]+$';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS ${LAST_INBOUND_PROVIDER_COLUMN} TEXT
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      ADD COLUMN IF NOT EXISTS ${PREFERRED_OUTBOUND_PROVIDER_COLUMN} TEXT
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('connectshyft.${THREADS_TABLE}') IS NULL THEN
        RETURN;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${LAST_INBOUND_PROVIDER_CHECK}'
          AND conrelid = 'connectshyft.${THREADS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${THREADS_TABLE}
          ADD CONSTRAINT ${LAST_INBOUND_PROVIDER_CHECK}
          CHECK (${LAST_INBOUND_PROVIDER_COLUMN} IS NULL OR ${LAST_INBOUND_PROVIDER_COLUMN} ~ '${E164_PATTERN}');
      END IF;
    END $$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('connectshyft.${THREADS_TABLE}') IS NULL THEN
        RETURN;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '${PREFERRED_OUTBOUND_PROVIDER_CHECK}'
          AND conrelid = 'connectshyft.${THREADS_TABLE}'::regclass
      ) THEN
        ALTER TABLE connectshyft.${THREADS_TABLE}
          ADD CONSTRAINT ${PREFERRED_OUTBOUND_PROVIDER_CHECK}
          CHECK (${PREFERRED_OUTBOUND_PROVIDER_COLUMN} IS NULL OR ${PREFERRED_OUTBOUND_PROVIDER_COLUMN} ~ '${E164_PATTERN}');
      END IF;
    END $$;
  `);

  await knex.raw(`
    UPDATE connectshyft.${THREADS_TABLE}
    SET ${LAST_INBOUND_PROVIDER_COLUMN} = BTRIM(last_inbound_cs_number_id)
    WHERE (${LAST_INBOUND_PROVIDER_COLUMN} IS NULL OR BTRIM(${LAST_INBOUND_PROVIDER_COLUMN}) = '')
      AND BTRIM(last_inbound_cs_number_id) ~ '${E164_PATTERN}'
  `);

  await knex.raw(`
    UPDATE connectshyft.${THREADS_TABLE}
    SET ${PREFERRED_OUTBOUND_PROVIDER_COLUMN} = BTRIM(preferred_outbound_cs_number_id)
    WHERE (${PREFERRED_OUTBOUND_PROVIDER_COLUMN} IS NULL OR BTRIM(${PREFERRED_OUTBOUND_PROVIDER_COLUMN}) = '')
      AND BTRIM(preferred_outbound_cs_number_id) ~ '${E164_PATTERN}'
  `);

  await knex.raw(`
    WITH deterministic_org_unit_mapping AS (
      SELECT
        tenant_id,
        org_unit_id,
        MAX(twilio_number_e164) AS twilio_number_e164
      FROM connectshyft.cs_number_mappings
      WHERE is_active = TRUE
      GROUP BY tenant_id, org_unit_id
      HAVING COUNT(*) = 1
    )
    UPDATE connectshyft.${THREADS_TABLE} AS threads
    SET ${LAST_INBOUND_PROVIDER_COLUMN} = mappings.twilio_number_e164
    FROM deterministic_org_unit_mapping AS mappings
    WHERE threads.tenant_id = mappings.tenant_id
      AND threads.org_unit_id = mappings.org_unit_id
      AND (threads.${LAST_INBOUND_PROVIDER_COLUMN} IS NULL OR BTRIM(threads.${LAST_INBOUND_PROVIDER_COLUMN}) = '')
      AND BTRIM(threads.last_inbound_cs_number_id) ~* '${LEGACY_SENTINEL_PATTERN}'
  `);

  await knex.raw(`
    WITH deterministic_org_unit_mapping AS (
      SELECT
        tenant_id,
        org_unit_id,
        MAX(twilio_number_e164) AS twilio_number_e164
      FROM connectshyft.cs_number_mappings
      WHERE is_active = TRUE
      GROUP BY tenant_id, org_unit_id
      HAVING COUNT(*) = 1
    )
    UPDATE connectshyft.${THREADS_TABLE} AS threads
    SET ${PREFERRED_OUTBOUND_PROVIDER_COLUMN} = mappings.twilio_number_e164
    FROM deterministic_org_unit_mapping AS mappings
    WHERE threads.tenant_id = mappings.tenant_id
      AND threads.org_unit_id = mappings.org_unit_id
      AND (threads.${PREFERRED_OUTBOUND_PROVIDER_COLUMN} IS NULL OR BTRIM(threads.${PREFERRED_OUTBOUND_PROVIDER_COLUMN}) = '')
      AND BTRIM(threads.preferred_outbound_cs_number_id) ~* '${LEGACY_SENTINEL_PATTERN}'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      DROP CONSTRAINT IF EXISTS ${LAST_INBOUND_PROVIDER_CHECK}
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      DROP CONSTRAINT IF EXISTS ${PREFERRED_OUTBOUND_PROVIDER_CHECK}
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      DROP COLUMN IF EXISTS ${LAST_INBOUND_PROVIDER_COLUMN}
  `);
  await knex.raw(`
    ALTER TABLE IF EXISTS connectshyft.${THREADS_TABLE}
      DROP COLUMN IF EXISTS ${PREFERRED_OUTBOUND_PROVIDER_COLUMN}
  `);
}
