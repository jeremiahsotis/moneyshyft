# Data Model: CS-003 Telnyx Outbound Adapter

## Overview

CS-003 does not introduce bridge-session persistence. It introduces a real Telnyx outbound transport boundary and reuses current ConnectShyft persistence that already maps closely to the canonical communication provider-reference and webhook-receipt concepts.

## Entities

### 1. TelephonyDispatchCommand

**Purpose**: Provider-neutral command passed from app-layer dispatch orchestration into the shared telephony contract.

**Fields**

- `tenantId`
- `orgUnitId`
- `threadId`
- `providerKey`
- `channel`
  - `sms` or `voice`
- `targetPhone`
  - optional, normalized before dispatch
- `messageBody`
  - required for `sms`
- `callPolicy`
  - optional for `voice`; must remain locked to bridge/manual-retry guardrails already enforced in ConnectShyft
- `idempotencyKey`
- `actorId`
  - optional for provider-neutral command metadata

**Validation Rules**

- `threadId`, `tenantId`, and `orgUnitId` must be present.
- `messageBody` is required for SMS and must be absent for voice initiation.
- `providerKey` must resolve to an enabled, allowlisted provider.
- `targetPhone`, when supplied, must already satisfy shared phone identity validation rules.

**Relationships**

- Produced by ConnectShyft outbound routes and application orchestration.
- Consumed by `TelephonyProviderAdapter`.

### 2. TelephonyDispatchResult

**Purpose**: Provider-neutral response returned by the telephony adapter after outbound dispatch attempt.

**Fields**

- `providerKey`
- `channel`
  - `call` or `message`
- `providerMessageId`
  - nullable for call dispatch
- `providerLegId`
  - nullable for message dispatch
- `providerRequestId`
  - optional if available from Telnyx response metadata
- `adapterInvoked`
- `providerBranchingInDomain`
  - always `false`
- `requestedAt`
  - optional timestamp metadata

**Validation Rules**

- SMS results must carry `providerMessageId`.
- Voice-initiation results must carry a provider call/leg identifier.
- Provider-specific response payloads must be stripped before leaving infrastructure.

**Relationships**

- Returned by `TelephonyProviderAdapter`.
- Used by ConnectShyft to persist correlation mappings and truthful dispatch metadata.

### 3. communication_message

**Purpose**: Canonical outbound/inbound message concept represented in the ConnectShyft thread timeline.

**Current CS-003 Representation**

- Existing ConnectShyft thread/timeline message persistence

**Relevant Fields**

- `thread_id`
- `direction`
  - `outbound`
- `channel`
  - `sms`
- `body`
- `message_status`
  - initially `queued`, then `sent`/`failed`/later delivery states
- `idempotency_key`
- `provider_reference_id`
  - current implementation may materialize this through correlation mappings rather than a canonical FK

**Validation Rules**

- A single idempotent outbound request must not create duplicate message rows.
- Timeline content must remain provider-neutral even when provider references are stored elsewhere.

**State Transitions**

- `queued` -> `sent`
- `queued` -> `failed`
- `sent` -> `delivered`

### 4. telephony_provider_reference

**Purpose**: Canonical provider-reference concept that maps internal communication records to Telnyx identifiers.

**Current CS-003 Representation**

- `connectshyft.cs_provider_identifier_mappings`

**Relevant Fields**

- `tenant_id`
- `org_unit_id`
- `thread_id`
- `provider_name`
  - `telnyx`
- `identifier_kind`
  - `message` or `call_leg`
- `provider_identifier`
- `internal_reference_id`
- `created_at_utc`

**Validation Rules**

- `(provider_name, identifier_kind, provider_identifier)` must remain unique.
- Internal services must use internal IDs first; provider identifiers are reconciliation aids.

**Relationships**

- Linked to outbound messages and outbound call initiation records.
- Used to reconcile later provider webhooks without leaking Telnyx IDs into app-level domain identity.

### 5. communication_webhook_receipt

**Purpose**: Canonical replay-safe provider webhook receipt concept.

**Current CS-003 Representation**

- `connectshyft.cs_webhook_receipts`

**Relevant Fields**

- `tenant_id`
- `org_unit_id`
- `thread_id`
- `provider_name`
- `provider_event_id`
- `provider_identifier_kind`
- `provider_identifier`
- `canonical_event_type`
- `dedupe_key`
- `sid`
- `event_type`
- `processed_at_utc`
- `last_seen_at_utc`
  - if present in current schema evolution

**Validation Rules**

- Duplicate webhook events must not create duplicate state transitions or duplicate thread writes.
- Replay identity must remain unique per tenant/provider/event identity.

**Relationships**

- Correlates provider events back to provider references and thread activity.
- Supports future CS-004/CS-005 bridge/idempotency behavior without changing the outbound adapter boundary.

## Deferred Canonical Entities

### bridge_session

- Deferred to CS-004.
- CS-003 must not invent a ConnectShyft-local substitute just to make outbound call initiation look complete.

### bridge_leg

- Deferred to CS-004.
- Provider leg IDs created by CS-003 outbound call initiation should be compatible with later bridge-leg persistence.
