-- RouteShyft Postgres Schema
-- Generated 2026-02-17

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS route;

CREATE TABLE route.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL,
  requester_name text NOT NULL,
  zip_code text NOT NULL,
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  run_date_local date NOT NULL,
  day_part text NOT NULL,
  status text NOT NULL,
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES route.runs(id) ON DELETE CASCADE,
  status text NOT NULL,
  address text NOT NULL,
  sequence_index integer NOT NULL DEFAULT 0,
  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route.completion_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  stop_id uuid NOT NULL REFERENCES route.stops(id) ON DELETE CASCADE,
  created_at_utc timestamptz NOT NULL DEFAULT now()
);
