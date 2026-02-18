import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await knex.raw("CREATE SCHEMA IF NOT EXISTS route");

  await knex.schema.withSchema("route").createTable("requests", t => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("tenant_id").notNullable();
    t.text("request_type").notNullable();
    t.text("status").notNullable();
    t.text("requester_name").notNullable();
    t.text("zip_code").notNullable();
    t.timestamp("created_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.withSchema("route").createTable("runs", t => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("tenant_id").notNullable();
    t.uuid("org_unit_id").notNullable();
    t.date("run_date_local").notNullable();
    t.text("day_part").notNullable();
    t.text("status").notNullable();
    t.timestamp("created_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["tenant_id", "org_unit_id", "run_date_local", "day_part"], "route_runs_tenant_orgunit_daypart_idx");
  });

  await knex.schema.withSchema("route").createTable("stops", t => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("tenant_id").notNullable();
    t.uuid("org_unit_id").notNullable();
    t.uuid("run_id").notNullable().references("id").inTable("route.runs").onDelete("CASCADE");
    t.text("status").notNullable();
    t.text("address").notNullable();
    t.integer("sequence_index").notNullable().defaultTo(0);
    t.timestamp("created_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(["tenant_id", "org_unit_id", "run_id", "sequence_index"], "route_stops_tenant_orgunit_run_seq_idx");
  });

  await knex.schema.withSchema("route").createTable("completion_records", t => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("tenant_id").notNullable();
    t.uuid("stop_id").notNullable().references("id").inTable("route.stops").onDelete("CASCADE");
    t.timestamp("created_at_utc", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema("route").dropTableIfExists("completion_records");
  await knex.schema.withSchema("route").dropTableIfExists("stops");
  await knex.schema.withSchema("route").dropTableIfExists("runs");
  await knex.schema.withSchema("route").dropTableIfExists("requests");
  await knex.raw("DROP SCHEMA IF EXISTS route CASCADE");
}
