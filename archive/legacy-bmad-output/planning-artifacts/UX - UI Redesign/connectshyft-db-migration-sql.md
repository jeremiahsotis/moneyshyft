project_lane: connectshyft

# FILE: ConnectShyft-DB-Migration-SQL.md

# ConnectShyft DB Migration SQL (MVP)

Project: ConnectShyft
Purpose: Add ConnectShyft operational schema, constraints, and indexes for MVP.
DB: PostgreSQL 14+

## Locked semantics reflected in schema comments

### Thread lifecycle

- Canonical thread state enum: UNCLAIMED | CLAIMED | CLOSED
- Exactly one active thread per (tenant_id, org_unit_id, neighbor_id) where active = state != CLOSED and not archived
- Outbound tap (Call or Send SMS) on CLOSED reopens same thread: CLOSED -> UNCLAIMED
- Reopen on tap resets:
  - escalation_stage = 0, escalation_count = 0, next_evaluation_at_utc recalculated from now
  - last_engagement_at_utc resets immediately
  - last_activity_at_utc updates (as part of the action)
- Successful bridge connect performs auto-claim

### Activity vs engagement

- last_activity_at_utc (ordering signal): updates on inbound/outbound artifacts
- last_engagement_at_utc (inactivity/engagement signal): updates on:
  - claim
  - outbound SMS accepted
  - call tap (including reopen tap)
  - inbound SMS accepted
- last_engagement_at_utc does NOT update on:
  - voicemail-only inbound
  - missed inbound voice
  - intake fallback transfer

### Inbound voice routing (deterministic)

- No active thread: forward to intake + audit/timeline event; does not reopen
- Active UNCLAIMED: voicemail-only
- Active CLAIMED: orgUnit-configurable, default forward to claimant
  - allowed: FORWARD_TO_CLAIMANT, VOICEMAIL_ONLY, FORWARD_TO_INTAKE
- CLOSED: forward to intake; does not reopen

### Notes for implementers

- Foreign keys to shared platform tenants/org_units/users are intentionally omitted; add in the monolith layer if canonical tables exist.
- Webhook idempotency relies on DB uniqueness constraints on Twilio SIDs plus transactional upsert patterns.

---

## Migration

```sql
BEGIN;

-- ----------
-- Extensions
-- ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------
-- Enums
-- ----------
DO $$ BEGIN
  CREATE TYPE cs_thread_state AS ENUM ('UNCLAIMED','CLAIMED','CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cs_prefers_texting AS ENUM ('UNKNOWN','YES','NO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cs_call_state AS ENUM (
    'INITIATED',
    'VOLUNTEER_RINGING',
    'VOLUNTEER_NO_ANSWER',
    'NEIGHBOR_RINGING',
    'CONNECTED',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cs_voice_claimed_mode AS ENUM ('FORWARD_TO_CLAIMANT','VOICEMAIL_ONLY','FORWARD_TO_INTAKE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cs_message_direction AS ENUM ('INBOUND','OUTBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------
-- OrgUnit config
-- ---------------------
CREATE TABLE IF NOT EXISTS cs_org_unit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,

  escalation_baseline_hours int NOT NULL DEFAULT 24 CHECK (escalation_baseline_hours BETWEEN 1 AND 24),
  inbound_voice_claimed_mode cs_voice_claimed_mode NOT NULL DEFAULT 'FORWARD_TO_CLAIMANT',

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, org_unit_id)
);

-- -----------------------------------
-- ConnectShyft numbers + orgUnit mapping
-- -----------------------------------
CREATE TABLE IF NOT EXISTS cs_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,

  -- E164 canonical string, e.g. +12605551234
  phone_e164 text NOT NULL,

  is_active boolean NOT NULL DEFAULT true,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, phone_e164)
);

CREATE TABLE IF NOT EXISTS cs_org_unit_number_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,
  cs_number_id uuid NOT NULL REFERENCES cs_numbers(id) ON DELETE RESTRICT,

  outbound_priority int NOT NULL DEFAULT 100 CHECK (outbound_priority BETWEEN 0 AND 1000),
  inbound_enabled boolean NOT NULL DEFAULT true,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, org_unit_id, cs_number_id)
);

-- ----------------
-- Neighbor registry (tenant-scoped)
-- ----------------
CREATE TABLE IF NOT EXISTS cs_neighbors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,

  display_name text NOT NULL,

  email text NULL,
  address_line1 text NULL,
  address_line2 text NULL,
  city text NULL,
  state text NULL,
  postal_code text NULL,

  prefers_texting cs_prefers_texting NOT NULL DEFAULT 'UNKNOWN',

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now(),

  CHECK (length(display_name) > 0)
);

CREATE TABLE IF NOT EXISTS cs_neighbor_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  neighbor_id uuid NOT NULL REFERENCES cs_neighbors(id) ON DELETE CASCADE,

  phone_e164 text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_shared_phone boolean NOT NULL DEFAULT false,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, neighbor_id, phone_e164)
);

-- at most one primary phone per neighbor
CREATE UNIQUE INDEX IF NOT EXISTS cs_neighbor_primary_phone_uq
ON cs_neighbor_phones (tenant_id, neighbor_id)
WHERE is_primary = true;

-- ------------------------
-- Threads (orgUnit-scoped)
-- ------------------------
CREATE TABLE IF NOT EXISTS cs_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,
  neighbor_id uuid NOT NULL REFERENCES cs_neighbors(id) ON DELETE RESTRICT,

  state cs_thread_state NOT NULL DEFAULT 'UNCLAIMED',

  claimed_by_user_id uuid NULL,
  claimed_at_utc timestamptz NULL,
  closed_at_utc timestamptz NULL,

  escalation_stage int NOT NULL DEFAULT 0 CHECK (escalation_stage BETWEEN 0 AND 3),
  escalation_count int NOT NULL DEFAULT 0 CHECK (escalation_count BETWEEN 0 AND 999),
  next_evaluation_at_utc timestamptz NULL,

  -- ordering signal
  last_activity_at_utc timestamptz NOT NULL DEFAULT now(),

  -- inactivity/engagement signal
  last_engagement_at_utc timestamptz NOT NULL DEFAULT now(),

  last_inbound_cs_number_id uuid NULL REFERENCES cs_numbers(id) ON DELETE SET NULL,
  preferred_outbound_cs_number_id uuid NULL REFERENCES cs_numbers(id) ON DELETE SET NULL,

  is_archived boolean NOT NULL DEFAULT false,
  archived_at_utc timestamptz NULL,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now()
);

-- One active thread per neighbor per orgUnit
CREATE UNIQUE INDEX IF NOT EXISTS cs_threads_one_active_uq
ON cs_threads (tenant_id, org_unit_id, neighbor_id)
WHERE state <> 'CLOSED' AND is_archived = false;

-- Deterministic ordering indexes (tie-breaker id DESC)
CREATE INDEX IF NOT EXISTS cs_threads_inbox_order_idx
ON cs_threads (tenant_id, org_unit_id, state, last_activity_at_utc DESC, id DESC);

CREATE INDEX IF NOT EXISTS cs_threads_mine_order_idx
ON cs_threads (tenant_id, org_unit_id, claimed_by_user_id, state, last_activity_at_utc DESC, id DESC);

-- ---------
-- Messages
-- ---------
CREATE TABLE IF NOT EXISTS cs_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES cs_threads(id) ON DELETE CASCADE,
  neighbor_id uuid NOT NULL REFERENCES cs_neighbors(id) ON DELETE RESTRICT,

  direction cs_message_direction NOT NULL,
  body text NOT NULL,

  twilio_message_sid text NULL,
  created_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cs_messages_twilio_sid_uq
ON cs_messages (tenant_id, twilio_message_sid)
WHERE twilio_message_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS cs_messages_thread_idx
ON cs_messages (tenant_id, org_unit_id, thread_id, created_at_utc DESC);

-- -----------
-- Voicemails
-- -----------
CREATE TABLE IF NOT EXISTS cs_voicemails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES cs_threads(id) ON DELETE CASCADE,
  neighbor_id uuid NOT NULL REFERENCES cs_neighbors(id) ON DELETE RESTRICT,

  twilio_call_sid text NOT NULL,

  recording_url text NULL,
  duration_seconds int NULL,

  transcript_text text NULL,
  twilio_transcription_sid text NULL,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  transcribed_at_utc timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cs_voicemails_call_sid_uq
ON cs_voicemails (tenant_id, twilio_call_sid);

CREATE UNIQUE INDEX IF NOT EXISTS cs_voicemails_transcription_sid_uq
ON cs_voicemails (tenant_id, twilio_transcription_sid)
WHERE twilio_transcription_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS cs_voicemails_thread_idx
ON cs_voicemails (tenant_id, org_unit_id, thread_id, created_at_utc DESC);

-- -----------------------
-- Bridge call orchestration
-- -----------------------
CREATE TABLE IF NOT EXISTS cs_bridge_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES cs_threads(id) ON DELETE CASCADE,
  neighbor_id uuid NOT NULL REFERENCES cs_neighbors(id) ON DELETE RESTRICT,

  initiated_by_user_id uuid NOT NULL,

  leg1_call_sid text NULL,
  leg2_call_sid text NULL,

  state cs_call_state NOT NULL DEFAULT 'INITIATED',

  initiated_at_utc timestamptz NOT NULL DEFAULT now(),
  connected_at_utc timestamptz NULL,
  completed_at_utc timestamptz NULL,

  created_at_utc timestamptz NOT NULL DEFAULT now(),
  updated_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cs_bridge_calls_leg1_sid_uq
ON cs_bridge_calls (tenant_id, leg1_call_sid)
WHERE leg1_call_sid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cs_bridge_calls_leg2_sid_uq
ON cs_bridge_calls (tenant_id, leg2_call_sid)
WHERE leg2_call_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS cs_bridge_calls_thread_idx
ON cs_bridge_calls (tenant_id, org_unit_id, thread_id, initiated_at_utc DESC);

-- -------------
-- Audit events
-- -------------
CREATE TABLE IF NOT EXISTS cs_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  org_unit_id uuid NULL,
  actor_user_id uuid NULL,

  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cs_audit_events_entity_idx
ON cs_audit_events (tenant_id, entity_type, entity_id, created_at_utc DESC);

COMMIT;
```
