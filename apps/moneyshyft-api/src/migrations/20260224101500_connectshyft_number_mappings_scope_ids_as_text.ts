import { Knex } from 'knex';

const TENANT_FK = 'cs_number_mappings_tenant_id_foreign';
const ORG_UNIT_FK = 'cs_number_mappings_org_unit_id_foreign';
const UUID_REGEX = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('connectshyft.cs_number_mappings') IS NULL THEN
        RETURN;
      END IF;

      ALTER TABLE connectshyft.cs_number_mappings
        DROP CONSTRAINT IF EXISTS ${TENANT_FK};

      ALTER TABLE connectshyft.cs_number_mappings
        DROP CONSTRAINT IF EXISTS ${ORG_UNIT_FK};

      ALTER TABLE connectshyft.cs_number_mappings
        ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::text;

      ALTER TABLE connectshyft.cs_number_mappings
        ALTER COLUMN org_unit_id TYPE TEXT USING org_unit_id::text;
    END $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF to_regclass('connectshyft.cs_number_mappings') IS NULL THEN
        RETURN;
      END IF;

      DELETE FROM connectshyft.cs_number_mappings
      WHERE tenant_id !~* '${UUID_REGEX}'
         OR org_unit_id !~* '${UUID_REGEX}';

      ALTER TABLE connectshyft.cs_number_mappings
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;

      ALTER TABLE connectshyft.cs_number_mappings
        ALTER COLUMN org_unit_id TYPE UUID USING org_unit_id::uuid;

      ALTER TABLE connectshyft.cs_number_mappings
        ADD CONSTRAINT ${TENANT_FK}
        FOREIGN KEY (tenant_id)
        REFERENCES platform.tenants(id)
        ON DELETE CASCADE;

      ALTER TABLE connectshyft.cs_number_mappings
        ADD CONSTRAINT ${ORG_UNIT_FK}
        FOREIGN KEY (org_unit_id)
        REFERENCES platform.org_units(id)
        ON DELETE CASCADE;
    END $$;
  `);
}
