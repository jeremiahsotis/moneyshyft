# Data Model: CS-004 Call Bridge Flow

## Overview

CS-004 introduces persisted bridge-session orchestration. It adds canonical-equivalent `bridge_session` and `bridge_leg` persistence, uses provider-neutral bridge events in the domain layer, and reuses existing ConnectShyft provider-correlation and replay-safe webhook receipt persistence for webhook processing.

## Entities

### 1. bridge_session

**Purpose**: Represent one operator-to-neighbor call attempt whose state is authoritative across route calls, page refreshes, and provider webhook events.

**Canonical Equivalent**

- `bridge_session`

**Fields**

- `id`
- `tenant_id`
- `org_unit_id`
- `thread_id`
- `operator_participant_id`
- `target_participant_id`
- `operator_contact_point_id`
- `target_contact_point_id`
- `selected_outbound_contact_point_id`
  - nullable
- `bridge_status`
  - `created`
  - `operator_dialing`
  - `operator_answered`
  - `neighbor_dialing`
  - `neighbor_answered`
  - `bridged`
  - `completed`
  - `failed`
  - `canceled`
  - `expired`
- `failure_code`
  - nullable
- `failure_message`
  - nullable
- `ended_by`
  - nullable
- `idempotency_key`
  - nullable
- `audit_correlation_id`
  - nullable
- `created_at_utc`
- `updated_at_utc`
- `completed_at_utc`
  - nullable

**Validation Rules**

- One bridge session represents one contact attempt only.
- Session state is authoritative and must be persisted before and after progression side effects.
- Session state must not be owned by frontend state.
- Terminal states are `completed`, `failed`, `canceled`, and `expired`.

**Relationships**

- One `bridge_session` has exactly two bridge legs for CS-004: one operator leg and one neighbor leg.
- One `bridge_session` belongs to one ConnectShyft thread.

### 2. bridge_leg

**Purpose**: Represent each provider-controlled leg inside a bridge session so operator and neighbor progression can reconcile independently.

**Canonical Equivalent**

- `bridge_leg`

**Fields**

- `id`
- `tenant_id`
- `org_unit_id`
- `bridge_session_id`
- `leg_role`
  - `operator`
  - `neighbor`
- `contact_point_id`
- `provider_call_id`
  - nullable until provider accepts the call
- `leg_status`
  - `created`
  - `dialing`
  - `ringing`
  - `answered`
  - `failed`
  - `completed`
  - `canceled`
- `started_at_utc`
  - nullable
- `answered_at_utc`
  - nullable
- `ended_at_utc`
  - nullable
- `failure_code`
  - nullable
- `failure_message`
  - nullable
- `created_at_utc`
- `updated_at_utc`

**Validation Rules**

- Every session has one `operator` leg and one `neighbor` leg.
- Provider call IDs are unique per leg once assigned.
- Leg failures roll up into the owning session through orchestration logic.
- Replayed provider events update the existing leg instead of creating a new one.

**Relationships**

- Each leg belongs to one `bridge_session`.
- Each leg may map to one provider call identifier through provider-correlation persistence.

### 3. ProviderBridgeEvent

**Purpose**: Represent the provider-neutral event shape that bridge orchestration consumes after infrastructure translation.

**Fields**

- `type`
  - `operator_call_created`
  - `neighbor_call_created`
  - `operator_answered`
  - `neighbor_answered`
  - `bridge_connected`
  - `operator_failed`
  - `neighbor_failed`
  - `bridge_failed`
  - `completed`
- `bridgeSessionId`
- `providerCallId`
  - optional on non-created events
- `occurredAt`
  - optional
- `reason`
  - optional

**Validation Rules**

- Raw Telnyx payloads must be translated before constructing this event.
- The bridge domain must be able to apply these events without importing provider-specific payload shapes.

**Relationships**

- Produced by telephony provider translation plus ConnectShyft webhook correlation.
- Consumed by bridge domain/application orchestration.

### 4. telephony_provider_reference

**Purpose**: Map internal bridge-leg records to external provider call identifiers.

**Current CS-004 Representation**

- `connectshyft.cs_provider_identifier_mappings`

**Relevant Fields**

- `tenant_id`
- `org_unit_id`
- `thread_id`
- `provider_name`
- `identifier_kind`
  - `call_leg`
- `provider_identifier`
- `internal_reference_id`
  - bridge leg ID for bridge call flows
- `created_at_utc`

**Validation Rules**

- Each provider call identifier maps to one internal bridge-leg record.
- Correlation lookup must resolve the session and thread scope needed for webhook progression.
- Bridge flows must not continue using call-leg mappings that point only to old canonical dispatch events.

**Relationships**

- Operator and neighbor legs each create one call-leg mapping after provider acceptance.
- Webhook correlation resolves to the owning bridge leg and then the owning bridge session.

### 5. communication_webhook_receipt

**Purpose**: Provide replay-safe persistence for provider webhook events that may advance bridge state.

**Current CS-004 Representation**

- `connectshyft.cs_webhook_receipts`

**Relevant Fields**

- `tenant_id`
- `org_unit_id`
- `thread_id`
- `provider_name`
- `provider_event_id`
- `canonical_event_type`
- `sid`
- `event_type`
- `dedupe_key`
- `processing_status`
  - current implementation equivalent
- `processed_at_utc`
- `last_seen_at_utc`

**Validation Rules**

- Duplicate provider bridge events must be detectable before domain side effects are re-applied.
- Receipt persistence must happen before bridge domain mutation when practical.

**Relationships**

- A webhook receipt may drive one bridge-session mutation or be suppressed as a duplicate.

## State Transition Rules

### Bridge Session

- `created` -> `operator_dialing`
- `operator_dialing` -> `operator_answered`
- `operator_answered` -> `neighbor_dialing`
- `neighbor_dialing` -> `neighbor_answered`
- `neighbor_answered` -> `bridged`
- `bridged` -> `completed`
- any non-terminal in-flight state -> `failed`
- in-flight states may also move to `canceled` or `expired` when explicitly ended

### Bridge Leg

- `created` -> `dialing`
- `dialing` -> `ringing`
- `ringing` -> `answered`
- `answered` -> `completed`
- in-flight states may move to `failed` or `canceled`

## Invariants

- A bridge session may exist before either provider call ID exists.
- Neighbor dialing must not begin until the operator leg is answered.
- Bridge control must not run until both leg provider call IDs exist and both legs are answered.
- Duplicate or out-of-order webhook events must not create new sessions or new legs.
- Session and leg timestamps must reflect authoritative progression rather than frontend render time.
