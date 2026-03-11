-- Database schema for ConnectShyft Comms Core (V1)
-- Telnyx provider chosen for outbound calls/messages. Provider abstraction layer allows multiple providers in future.
-- NOTE: Timestamps are stored as UTC. The application enforces America/Indiana/Indianapolis timezone for display.

-- Users of ConnectShyft (volunteers, neighbors)
CREATE TABLE users (
  id                 UUID PRIMARY KEY,
  tenant_id          UUID NOT NULL,
  role               VARCHAR(32) NOT NULL CHECK (role IN ('volunteer','neighbor','admin','on_call')),
  preferred_language VARCHAR(8) NOT NULL DEFAULT 'en',
  phone_number       VARCHAR(20) UNIQUE,
  created_at_utc     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants (organizations or units using the platform)
CREATE TABLE tenants (
  id                         UUID PRIMARY KEY,
  name                       VARCHAR(128) NOT NULL,
  default_preferred_language VARCHAR(8) NOT NULL DEFAULT 'en',
  created_at_utc             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- On-call schedules (rotations). Each schedule references a user who is on call for a given period.
CREATE TABLE on_call_schedules (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  schedule_name  VARCHAR(64) NOT NULL,
  start_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time_utc   TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mapping table linking schedules to users for the rotation
CREATE TABLE on_call_schedule_users (
  schedule_id UUID NOT NULL REFERENCES on_call_schedules(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  position    INTEGER NOT NULL,
  PRIMARY KEY (schedule_id, user_id)
);

-- Ring groups (collections of users who should be notified concurrently)
CREATE TABLE ring_groups (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  name           VARCHAR(64) NOT NULL,
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members of each ring group
CREATE TABLE ring_group_members (
  ring_group_id UUID NOT NULL REFERENCES ring_groups(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  PRIMARY KEY (ring_group_id, user_id)
);

-- Conferences (service interactions)
CREATE TABLE conferences (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  name                VARCHAR(128) NOT NULL,
  description         TEXT,
  claimant_routing    VARCHAR(32) NOT NULL DEFAULT 'CLAIMANT' CHECK (claimant_routing IN ('CLAIMANT','ON_CALL_USER','RING_GROUP')),
  on_call_schedule_id UUID REFERENCES on_call_schedules(id),
  ring_group_id       UUID REFERENCES ring_groups(id),
  created_at_utc      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call attempts: each call made or received via the comms core.
CREATE TABLE call_attempts (
  id             UUID PRIMARY KEY,
  conference_id  UUID NOT NULL REFERENCES conferences(id),
  direction      VARCHAR(8) NOT NULL CHECK (direction IN ('outbound','inbound')),
  from_number    VARCHAR(20) NOT NULL,
  to_number      VARCHAR(20) NOT NULL,
  status         VARCHAR(32) NOT NULL DEFAULT 'initiated',
  -- call_attempt_id will be sent in Telnyx metadata for bridging.
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider legs: each provider-specific call leg (Telnyx call leg ID). Used for fallback mapping.
CREATE TABLE provider_legs (
  id              UUID PRIMARY KEY,
  call_attempt_id UUID NOT NULL REFERENCES call_attempts(id) ON DELETE CASCADE,
  provider_name   VARCHAR(64) NOT NULL, -- e.g. 'telnyx'
  provider_leg_id VARCHAR(128) NOT NULL,
  created_at_utc  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_name, provider_leg_id)
);

-- Messages (SMS/MMS). Each record corresponds to a message sent or received.
CREATE TABLE messages (
  id             UUID PRIMARY KEY,
  conference_id  UUID NOT NULL REFERENCES conferences(id),
  direction      VARCHAR(8) NOT NULL CHECK (direction IN ('outbound','inbound')),
  from_number    VARCHAR(20) NOT NULL,
  to_number      VARCHAR(20) NOT NULL,
  body           TEXT,
  media_url      TEXT,
  status         VARCHAR(32) NOT NULL DEFAULT 'queued',
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider message IDs (Telnyx message UUID mapping). Used for fallback.
CREATE TABLE provider_message_ids (
  id                  UUID PRIMARY KEY,
  message_id          UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider_name       VARCHAR(64) NOT NULL,
  provider_message_id VARCHAR(128) NOT NULL,
  created_at_utc      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_name, provider_message_id)
);

-- Inbound routing rules: map inbound numbers to conferences and routing decisions.
CREATE TABLE inbound_routing_rules (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  inbound_number VARCHAR(20) NOT NULL,
  conference_id  UUID NOT NULL REFERENCES conferences(id),
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, inbound_number)
);

-- Event log to capture canonical events for auditing and processing.
CREATE TABLE events (
  id             UUID PRIMARY KEY,
  event_type     VARCHAR(64) NOT NULL,
  aggregate_id   UUID NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  payload        JSONB NOT NULL,
  created_at_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
