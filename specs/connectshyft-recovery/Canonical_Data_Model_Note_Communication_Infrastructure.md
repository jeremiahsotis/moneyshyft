# Canonical Data Model Note: Communication Identity, Bridge Sessions, Idempotency, and Audit

Status: Proposed  
Date: 2026-03-10  
Applies To: ConnectShyft now, People Core Domain next, ProgramShyft / CaseShyft later  
Governing ADR: ADR-00X Communication Infrastructure Contract

## 1. Purpose

This note defines the minimum canonical data model needed to keep ConnectShyft implementation on track while avoiding future cleanup when People Core Domain is introduced.

This is intentionally one layer more concrete than the ADR, but still not a full database build sheet. It locks the shapes and ownership boundaries that matter, while leaving room for sane implementation choices.

## 2. Design Intent

The data model must support all of the following at the same time:

- human-friendly phone input with canonical internal storage
- multiple phone numbers per person/contact
- communication traits that can surface cleanly in UI
- outbound SMS and voice through a provider adapter
- persisted bridge-call orchestration
- retry-safe idempotent mutation handling
- durable communication audit history
- future reuse by People Core Domain, ProgramShyft, and CaseShyft

## 3. Canonical Entities

### 3.1 `communication_contact_point`

Purpose: store reusable contact endpoints such as phone numbers.

This is the canonical record for a reachable endpoint. It is not ConnectShyft-specific.

#### Required fields
- `id`
- `tenant_id`
- `owner_type`
  - expected values initially: `person`, `contact`, `household`
- `owner_id`
- `channel`
  - expected values initially: `phone`
- `label`
  - examples: `mobile`, `home`, `work`, `shared household`
- `raw_input`
  - optional
- `normalized_e164`
  - required for phone
- `display_national`
- `country_code`
- `national_number`
- `extension`
  - optional
- `validation_status`
  - `valid`, `invalid`, `needs_review`
- `usage_type`
  - `mobile`, `landline`, `unknown`
- `is_primary`
- `is_active`
- `source`
  - `user_entered`, `imported`, `system_generated`
- `created_at`
- `updated_at`

#### Rules
- `normalized_e164` is the canonical lookup and dedupe value.
- `display_national` is for UI only.
- `raw_input` should never be required for domain logic.
- Multiple active records per owner are allowed.
- Only one primary per owner/channel combination should be allowed at a time.

#### Why this exists
This prevents phone identity from being trapped in a local ConnectShyft form helper or buried inside thread records.

---

### 3.2 `communication_contact_trait`

Purpose: store communication-specific preferences and flags that belong near contact identity, not in random UI state.

#### Required fields
- `id`
- `tenant_id`
- `owner_type`
- `owner_id`
- `trait_key`
  - examples: `prefers_texting`, `shared_phone`, `do_not_text`, `do_not_call`
- `trait_value`
  - boolean/string/json depending on implementation choice
- `created_at`
- `updated_at`

#### Rules
- Start simple, but make traits reusable across modules.
- `prefers_texting` and `shared_phone` are first-class because they already appear as stable UI concepts.
- This table should not become a junk drawer for arbitrary profile data unrelated to communications.

#### Why this exists
The ConnectShyft prototype treats these as durable relationship facts, not temporary visual chips.

---

### 3.3 `communication_participant`

Purpose: normalize the actor/target identity used in messages, calls, and bridge sessions.

#### Required fields
- `id`
- `tenant_id`
- `entity_type`
  - examples: `person`, `user`, `household`, `staff`, `volunteer`
- `entity_id`
- `display_name`
- `created_at`
- `updated_at`

#### Rules
- This record is optional if your existing identity model already solves it cleanly.
- If not optional, this becomes the stable join point for communications activity.
- Do not force ConnectShyft to invent a second identity model if one already exists.

#### Why this exists
It gives a neutral bridge between People Core and communications without forcing all future modules to point directly at ConnectShyft-specific concepts.

---

### 3.4 `telephony_provider_reference`

Purpose: map internal communication records to external provider identifiers.

#### Required fields
- `id`
- `tenant_id`
- `provider_name`
  - initial value: `telnyx`
- `reference_type`
  - examples: `message`, `call_leg`, `bridge_session`, `webhook_event`
- `internal_entity_type`
- `internal_entity_id`
- `provider_reference_id`
- `secondary_reference_id`
  - optional
- `created_at`

#### Rules
- Provider identifiers are stored for reconciliation, debugging, and webhook correlation.
- Internal services should use internal IDs first.
- No upstream service should need to know raw Telnyx IDs to function.

#### Why this exists
It keeps provider coupling at the infrastructure edge.

---

### 3.5 `communication_message`

Purpose: represent an outbound or inbound message event in the system timeline.

#### Required fields
- `id`
- `tenant_id`
- `thread_id`
- `direction`
  - `inbound`, `outbound`
- `channel`
  - `sms`, later maybe `email`
- `from_contact_point_id`
- `to_contact_point_id`
- `actor_participant_id`
  - optional for inbound
- `counterparty_participant_id`
  - optional if only contact point is known
- `body`
- `message_status`
  - `queued`, `sent`, `delivered`, `failed`, `received`
- `provider_reference_id`
  - optional join convenience
- `idempotency_key`
  - nullable for provider-originated inbound
- `created_at`
- `updated_at`

#### Rules
- This is timeline content, not the provider receipt table.
- Provider delivery details may update status, but the message record remains the domain record.
- Duplicate webhook events must not create duplicate message records.

---

### 3.6 `bridge_session`

Purpose: represent one operator-to-neighbor call attempt that may include two call legs and a bridged state.

#### Required fields
- `id`
- `tenant_id`
- `thread_id`
- `operator_participant_id`
- `target_participant_id`
- `operator_contact_point_id`
- `target_contact_point_id`
- `selected_outbound_contact_point_id`
  - nullable if outbound caller identity is represented elsewhere
- `bridge_status`
  - `created`, `operator_dialing`, `operator_answered`, `neighbor_dialing`, `neighbor_answered`, `bridged`, `completed`, `failed`, `canceled`, `expired`
- `failure_code`
  - nullable
- `failure_message`
  - nullable
- `ended_by`
  - nullable
- `idempotency_key`
- `audit_correlation_id`
- `created_at`
- `updated_at`
- `completed_at`
  - nullable

#### Rules
- One bridge session = one interaction attempt, not a forever call relationship.
- Status is persisted and authoritative.
- UI reads this state; it does not own it.
- Repeated provider events may update the same bridge session but must never create duplicate sessions.

#### Why this exists
Without this, bridge orchestration degrades into brittle frontend sequencing and webhook race conditions.

---

### 3.7 `bridge_leg`

Purpose: track each leg of a bridge session separately.

#### Required fields
- `id`
- `tenant_id`
- `bridge_session_id`
- `leg_role`
  - `operator`, `neighbor`
- `contact_point_id`
- `provider_call_id`
- `leg_status`
  - `created`, `dialing`, `ringing`, `answered`, `failed`, `completed`, `canceled`
- `started_at`
  - nullable
- `answered_at`
  - nullable
- `ended_at`
  - nullable
- `failure_code`
  - nullable
- `failure_message`
  - nullable
- `created_at`
- `updated_at`

#### Rules
- Legs are separate so out-of-order events can reconcile cleanly.
- A bridge session may exist before both legs exist.
- Leg-level failures should roll up into bridge-session state through application logic.

#### Why this exists
This is the minimum sane structure for reliable call-control and audit.

---

### 3.8 `communication_idempotency_record`

Purpose: make outbound mutations retry-safe.

#### Required fields
- `id`
- `tenant_id`
- `idempotency_key`
- `operation_name`
  - examples: `send_sms`, `start_outbound_call`, `start_bridge_session`, `end_bridge_session`
- `actor_id`
  - nullable for system-originated work
- `request_fingerprint`
- `request_summary`
  - optional serialized summary
- `resource_type`
- `resource_id`
  - nullable until created
- `status`
  - `in_progress`, `succeeded`, `failed`
- `response_snapshot`
  - optional
- `first_seen_at`
- `last_seen_at`
- `expires_at`

#### Rules
- Unique constraint should include at least tenant plus idempotency key plus operation scope.
- Same key + different materially relevant payload must fail loudly.
- Same key + same payload returns the original or current authoritative result.
- This record is about request safety, not business history.

#### Why this exists
Without a durable idempotency record, retries create duplicate calls, duplicate SMS records, or impossible webhook reconciliation.

---

### 3.9 `communication_audit_log`

Purpose: durable audit history for communication mutations and major state transitions.

#### Required fields
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
- `channel`
  - `sms`, `voice`, `bridge`, `webhook`
- `result_state`
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

#### Rules
- Audit is append-only.
- Audit is not the same thing as the user-facing timeline.
- Provider webhook receipts and command-side actions may both create audit rows, but they must be distinguishable.

#### Why this exists
This is what lets you debug, prove behavior, and build reliability without leaking provider guts into the UI.

---

### 3.10 `communication_webhook_receipt`

Purpose: store or checkpoint provider webhook events in a replay-safe way.

#### Required fields
- `id`
- `tenant_id`
- `provider_name`
- `event_type`
- `provider_event_id`
  - nullable if provider does not supply one consistently
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
- `raw_payload`
  - implementation may store raw or pointer
- `headers_json`
  - optional

#### Rules
- Webhook handling must be replay-safe.
- Duplicate provider events must be detectable.
- Signature verification status must be preserved.

#### Why this exists
Without this, webhook processing turns into guesswork and repeated side effects.

## 4. Ownership Boundaries

### Shared communication / People-safe domain owns
- `communication_contact_point`
- `communication_contact_trait`
- `communication_idempotency_record`
- `communication_audit_log`
- domain services for parsing, normalization, formatting, and channel validation

### Communication application / orchestration layer owns
- `communication_message`
- `bridge_session`
- `bridge_leg`

### Infrastructure adapter layer owns
- `telephony_provider_reference`
- `communication_webhook_receipt`
- provider translation and signature verification

### ConnectShyft owns
- thread actions using the shared communication model
- volunteer-facing rendering of normalized communication data
- no local schema forks of phone identity or bridge orchestration

## 5. Minimum Relationship Map

Recommended relationship shape:

- one owner can have many `communication_contact_point`
- one owner can have many `communication_contact_trait`
- one thread can have many `communication_message`
- one thread can have many `bridge_session`
- one `bridge_session` has many `bridge_leg`
- one communication operation can have one `communication_idempotency_record`
- one operation or state transition can emit many `communication_audit_log`
- one provider event can map to zero or more internal records through `telephony_provider_reference`

## 6. Required Invariants

These are non-negotiable.

1. End-user forms must never require E.164.
2. Canonical phone storage must use `normalized_e164`.
3. Multiple phone numbers per owner must be supported.
4. `prefers_texting` and `shared_phone` must not live only as local UI labels.
5. Telnyx identifiers must not become the system's primary IDs.
6. Bridge status must persist outside frontend state.
7. Outbound communication mutations must be idempotent.
8. Duplicate webhook events must be safe to replay.
9. Audit history must be append-only.
10. ConnectShyft must consume this model, not reinvent it.

## 7. Recommended Constraint Patterns

These are recommendations, not forced SQL.

- Unique partial constraint for one primary contact point per owner/channel
- Unique constraint for provider reference uniqueness by provider + type + provider_reference_id
- Unique constraint for idempotency scope
- Foreign key from `bridge_leg.bridge_session_id` to `bridge_session.id`
- Indexed lookup on `normalized_e164`
- Indexed lookup on `thread_id`
- Indexed lookup on `provider_reference_id` and `provider_event_id`

## 8. Migration Strategy

Implement in this order:

### Phase A
- `communication_contact_point`
- `communication_contact_trait`

### Phase B
- `communication_idempotency_record`
- `communication_audit_log`

### Phase C
- `bridge_session`
- `bridge_leg`

### Phase D
- `telephony_provider_reference`
- `communication_webhook_receipt`

### Phase E
- wire `communication_message` status updates through adapter + webhook flow

This order keeps phone identity and reliability from becoming afterthoughts.

## 9. Deliberate Non-Decisions

This note does not lock:
- exact SQL dialect details
- exact migration file names
- exact ORM model names
- exact queue technology
- exact JSON column vs text column choice
- exact retention durations for webhook receipts and idempotency records

Those can be solved in implementation as long as the entity shapes and invariants above remain intact.

## 10. Definition of Done

This note is considered implemented when:

- phone numbers are stored through `communication_contact_point` or an equivalent model with the same canonical shape
- communication traits like `prefers_texting` and `shared_phone` are durable data, not ad hoc UI strings
- bridge sessions and legs persist outside the UI
- idempotency records prevent duplicate outbound mutations
- audit logs capture communication actions and outcomes
- webhook receipts are replay-safe
- ConnectShyft uses this shared model without creating local forks

## 11. Practical Warning

Do not let a developer collapse this into:
- `users.phone`
- `calls` with no leg table
- `messages` with provider ids mixed into app logic
- “just use request retry middleware” instead of durable idempotency

That would work briefly and then force cleanup when People Core Domain lands.
