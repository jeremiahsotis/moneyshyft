# Data Model: CS-005 Reliability / Idempotency / Audit

## Scope

CS-005 adds the minimum durable reliability persistence needed for outbound command safety, replay-safe webhook handling, bounded retry intent, and append-only audit evidence. It does not redesign bridge-session or provider-adapter ownership.

## Entities

### 1. Communication Idempotency Record

Purpose: prevent duplicate outbound side effects before they happen and return the authoritative prior/current result for safe retries.

Representative canonical fields:
- `id`
- `tenant_id`
- `idempotency_key`
- `operation_name`
  - `send_sms`, `start_outbound_call`, `start_bridge_session`, `apply_provider_event`
- `actor_id`
  - nullable for system-originated work
- `request_fingerprint`
- `request_summary`
  - serialized summary of materially relevant request fields
- `resource_type`
  - `communication_message`, `bridge_session`, or equivalent
- `resource_id`
  - nullable until authoritative resource exists
- `status`
  - `in_progress`, `succeeded`, `failed`
- `response_snapshot`
  - optional serialized authoritative response
- `attempt_count`
  - minimal bounded retry bookkeeping
- `last_attempted_at`
- `next_retry_at`
  - nullable
- `last_failure_classification`
  - normalized provider/application failure category
- `first_seen_at`
- `last_seen_at`
- `expires_at`

Validation rules:
- unique scope must include at least tenant + operation + idempotency key
- same scope + different `request_fingerprint` is a conflict
- idempotency record must exist before any outbound provider side effect
- `response_snapshot` must only reflect authoritative application state

State transitions:
- `in_progress -> succeeded`
- `in_progress -> failed`
- `failed -> failed` with updated bounded retry metadata only; no mutation of prior audit rows

### 2. Communication Audit Log

Purpose: append-only operational history for outbound mutations, duplicate suppression, retry decisions, and webhook outcomes.

Representative canonical fields:
- `id`
- `tenant_id`
- `correlation_id`
- `actor_type`
  - `user`, `system`, `provider`
- `actor_id`
  - nullable
- `operation_name`
- `target_entity_type`
- `target_entity_id`
  - nullable
- `channel`
  - `sms`, `voice`, `bridge`, `webhook`
- `result_state`
  - `succeeded`, `failed`, `ignored_duplicate`, `retrying`, `exhausted`
- `result_code`
  - nullable
- `result_message`
  - nullable
- `idempotency_key`
  - nullable
- `provider_name`
  - nullable
- `provider_reference_id`
  - nullable
- `metadata_json`
- `created_at`

Validation rules:
- audit rows are append-only; updates and deletes are out of scope
- command-side and webhook-side audit rows must be distinguishable by `operation_name`, `channel`, and metadata
- duplicate suppression and retry decisions must create new audit rows rather than mutate old ones

### 3. Communication Webhook Receipt

Purpose: checkpoint provider ingress, support duplicate detection before application side effects, and persist bounded retry intent for webhook-processing failures.

Representative fields:
- `id`
- `tenant_id`
- `provider_name`
- `event_type`
- `provider_event_id`
  - nullable when provider omits it
- `signature_verified`
- `payload_hash`
- `received_at`
- `processed_at`
  - nullable
- `processing_status`
  - `received`, `processed`, `ignored_duplicate`, `failed`
- `failure_message`
  - nullable
- `correlation_id`
  - nullable
- `retry_count`
- `next_retry_at`
  - nullable
- `last_failure_classification`
  - nullable
- `raw_payload`
  - raw or pointer depending on implementation
- `headers_json`
  - optional

Validation rules:
- duplicate detection occurs before event application
- `signature_verified` must be preserved
- replayed or duplicate receipts must not duplicate domain state changes
- retry metadata must remain bounded and classification-driven

State transitions:
- `received -> processed`
- `received -> ignored_duplicate`
- `received -> failed`
- `failed -> failed` with incremented retry metadata until exhausted

### 4. Bridge Session

Purpose: remain the authoritative persisted state machine for bridge calling while CS-005 adds surrounding reliability hardening.

Relevant existing fields:
- `id`
- `thread_id`
- `bridge_status`
- `failure_code`
- `failure_message`
- `idempotency_key`
- `audit_correlation_id`
- timestamps

Reliability rules:
- bridge state remains domain-driven and authoritative
- retry handling must not create or advance bridge states outside existing bridge-domain entry points
- repeated provider events reconcile against existing bridge-session and bridge-leg state

### 5. Communication Message

Purpose: remain the authoritative message/timeline record while command-side idempotency and audit hardening prevent duplicate creation.

Relevant existing fields:
- `id`
- `thread_id`
- `direction`
- `channel`
- `message_status`
- `provider_reference_id`
- `idempotency_key`
- timestamps

Reliability rules:
- duplicate outbound retries must not create duplicate message records
- provider delivery/status events may update message state but duplicate webhooks must not create duplicate message rows

## Relationships

- One tenant can have many `communication_idempotency_record`
- One outbound mutation can have one current idempotency record and many audit rows
- One webhook receipt can have many related audit rows across receipt, duplicate, retry, and processed outcomes
- One bridge session can be associated with an idempotency record and many audit rows
- One communication message can be associated with an idempotency record and many audit rows

## Invariants

- Idempotency happens before outbound side effects
- Duplicate webhook detection happens before domain event application
- Retry decisions never bypass bridge/message domain ownership
- Audit is append-only
- Provider-native identifiers remain stored for reconciliation, but upstream logic operates on internal resource state first
