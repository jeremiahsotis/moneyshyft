# Slice 25 — Bridge Lifecycle + Telephony (Codex‑Ready Implementation Brief)

## 1. OBJECTIVE

Implement a complete **telephony call lifecycle** built upon the existing bridge‑session domain.  Calls must progress deterministically from operator dialing through bridging to completion, failure or voicemail fallback.  Telephony artifacts (call, voicemail, delivery attempt and provider event) must be persisted in ConnectShyft’s database with person‑scoped keys so that telephony remains **person‑bound** and rebind‑safe.  The UI needs a unified timeline that includes SMS, calls and voicemail; dispatch APIs must enforce the lifecycle state machine and surface meaningful error codes when calling is not possible.  Slice 25 does **not** redesign the provider adapter surface or call control; it layers persistence, state orchestration and timeline projection over the existing bridge domain.

## 2. ARCHITECTURAL DECISIONS (LOCKED)

1. **Person‑bound calls** – Each call is anchored to a person via `personId` (derived from the thread’s subject).  Calls must survive rebinding; persisting calls keyed only by `threadId` is insufficient because threads can migrate between persons.  The `cs_calls` and `cs_voicemails` tables include `person_id` in addition to `thread_id`.
2. **Bridge session remains the orchestrator** – The existing bridge session domain (`domains/communication/bridge`) remains the authoritative engine for dialing, answering and bridging.  ConnectShyft telephony simply persists call and voicemail artifacts and wires provider events into the domain functions.  There is **no redesign** of the bridge state machine or provider adapters.
3. **Separate persistence for calls and voicemail** – New tables capture call and voicemail metadata.  A call record reflects the lifecycle of a bridge session; a voicemail record is created only when a voicemail fallback occurs.  The `cs_delivery_attempts` and `cs_provider_events` tables capture low‑level retry attempts and idempotent provider events respectively.
4. **Idempotent provider event ingestion** – Provider webhooks may deliver duplicate or out‑of‑order events.  Ingested events are persisted in `cs_provider_events` keyed by `(tenant_id, provider_event_id)` and deduplicated.  Application handlers should be idempotent and replay‑safe.
5. **Thread timeline projection** – The telephony timeline is a read‑only projection that composes SMS, call and voicemail events without rewriting underlying artifacts.  Projection logic lives in `threadTimeline.ts` and uses call/voicemail records plus bridge session state to build timeline items.  It is safe to regenerate the projection on demand.
6. **No UI implementation here** – This slice exposes data and service surfaces required by the future UI.  Actual UI components and interactions are deferred to front‑end slices.

## 3. EXECUTION FLOW

### 3.1 Start Call / Bridge Session

1. **Initiate** – `POST /api/v1/connectshyft/thread/:threadId/call` is called with no body.  The handler resolves tenant, orgUnit, thread and person context, verifies telephony readiness (Slice 23), and checks that no active bridge session exists for the thread.
2. **Persist call** – The handler creates a `cs_calls` row with a new `callId`, `tenant_id`, `org_unit_id`, `thread_id`, `person_id`, `status: 'operator_dialing'`, `started_at_utc: now`, and `bridge_session_id: null`.  This call record is updated as the session progresses.
3. **Start bridge session** – The handler delegates to `bridgeSessions.startBridgeSession` (existing function) to create a new bridge session aggregate.  The domain returns a `bridgeSessionId` and initial leg state.  Persist the `bridge_session_id` onto the call record.
4. **Return** – The API returns a success envelope with the call DTO (`callId`, `status`, `startedAtUtc`, etc.) and the bridge session status (`operator_dialing`).

### 3.2 Provider Events → State Advancement

1. **Receive webhook** – Provider webhooks are sent to `/api/v1/connectshyft/provider-events`.  The handler resolves `bridgeSessionId` using provider call IDs or correlation mappings.  It records the event in `cs_provider_events` if `(tenant_id, provider_event_id)` is not already persisted.
2. **Apply domain transition** – The handler calls `handleProviderBridgeEvent` from the bridge domain, passing the `BridgeSessionAggregate` and the provider event.  This returns a new aggregate with advanced session/leg statuses.
3. **Persist aggregate** – Save the aggregate using `bridgeSessionRepository.saveAggregate`.  In parallel update the corresponding call record’s `status`, `answered_at_utc`, `ended_at_utc` or `failure_code/message` based on the new session state:
   * `operator_answered` → set `operator_answered_at_utc` on the call and status `operator_answered`.
   * `neighbor_answered` → set `neighbor_answered_at_utc` and status `neighbor_answered`.
   * `bridged` → set `bridged_at_utc` and status `bridged`.
   * `completed` → set `completed_at_utc` and status `completed`.
   * `failed` / `canceled` / `expired` → set `ended_at_utc` and `failure_code/message` and status accordingly.
4. **Return** – Acknowledge the provider.  Idempotent replays do not re‑advance the session or duplicate call updates.

### 3.3 Voicemail Fallback

1. **Trigger fallback** – If the neighbor leg does not answer within the provider’s configured timeout, the bridge domain moves to `neighbor_failed` and triggers voicemail fallback logic (already in `bridgeSessions.ts`).  The provider sends a voicemail recording URL and artifact ID once recording completes.
2. **Persist voicemail** – The voicemail webhook handler creates a row in `cs_voicemails` with `voicemailId`, `callId`, `threadId`, `personId`, `artifactId`, `recordingUrl`, `recordingStatus` and `occurredAtUtc`.  It updates the call’s status to `'voicemail'` and sets `ended_at_utc` if not already set.
3. **Return** – The API returns a success envelope acknowledging the voicemail.  Duplicate voicemails are deduplicated by `artifactId`.

### 3.4 Endpoints

* **POST /api/v1/connectshyft/thread/:threadId/call** – Start a new call as described above.
* **GET /api/v1/connectshyft/call/:callId** – Return the call DTO with status, timestamps, bridge session status and voicemail info if applicable.
* **GET /api/v1/connectshyft/thread/:threadId/call-history** – Return all call DTOs for a thread ordered by `startedAtUtc` descending.  This is used by the timeline projection.
* **GET /api/v1/connectshyft/person/:personId/call-history** – Return all call DTOs across threads for the person.

## 4. STATE MACHINES

### 4.1 Call State

| Call Status            | Description                                                  | Next States                         |
|------------------------|--------------------------------------------------------------|-------------------------------------|
| `operator_dialing`     | Operator leg is dialing the operator’s phone.               | `operator_answered`, `failed`       |
| `operator_answered`    | Operator answered; neighbor leg is dialing.                 | `neighbor_dialing`, `failed`        |
| `neighbor_dialing`     | Neighbor leg is dialing the neighbor’s phone.               | `neighbor_answered`, `failed`       |
| `neighbor_answered`    | Neighbor answered; bridging about to occur.                 | `bridged`, `failed`                 |
| `bridged`              | Both legs connected; conversation in progress.              | `completed`, `failed`, `canceled`   |
| `voicemail`            | Bridging failed; voicemail fallback recorded.               | `completed`                         |
| `completed`            | Call completed normally (hangup by either party).           | —                                   |
| `failed`               | Call failed due to provider error or no answer.             | —                                   |
| `canceled` / `expired` | Call cancelled by operator or expired in queue.             | —                                   |

The call status mirrors the underlying `bridgeSession.status` but separates `voicemail` as a distinct call state.  Once a call is in `completed`, `failed` or `voicemail`, it is terminal.

### 4.2 Bridge Session & Leg State

The bridge domain’s state machine (`bridgeStateMachine.ts`) remains unchanged.  It defines session states (`created`, `operator_dialing`, `operator_answered`, `neighbor_dialing`, `neighbor_answered`, `bridged`, `completed`, `failed`, `canceled`, `expired`) and leg statuses (`created`, `dialing`, `ringing`, `answered`, `completed`, `failed`, `canceled`).

### 4.3 Voicemail State

| Voicemail Status | Description                     | Next States  |
|------------------|---------------------------------|--------------|
| `pending`        | Recording in progress.           | `completed`, `failed` |
| `completed`      | Recording finished successfully. | —            |
| `failed`         | Recording failed.                | —            |

## 5. DATABASE CONTRACTS

### 5.1 `connectshyft.cs_calls` (new)

| Column               | Type        | Constraints                                                                        |
|----------------------|-------------|------------------------------------------------------------------------------------|
| `id`                 | TEXT        | Primary key (callId); generated via `randomUUID()`                                 |
| `tenant_id`          | TEXT        | NOT NULL; scope for multitenancy                                                   |
| `org_unit_id`        | TEXT        | NOT NULL; orgUnit scope                                                            |
| `thread_id`          | TEXT        | NOT NULL; thread context                                                           |
| `person_id`          | TEXT        | NOT NULL; person the call is bound to                                             |
| `bridge_session_id`  | TEXT        | NULLABLE; references `cs_bridge_sessions.id`; set when session created             |
| `status`             | TEXT        | NOT NULL; CHECK (`status` IN ('operator_dialing','operator_answered','neighbor_dialing','neighbor_answered','bridged','voicemail','completed','failed','canceled','expired')) |
| `failure_code`       | TEXT        | NULLABLE; enumeration aligned with `BridgeFailureCode`                              |
| `failure_message`    | TEXT        | NULLABLE                                                                           |
| `started_at_utc`     | TIMESTAMPTZ | NOT NULL; call initiation time                                                     |
| `operator_answered_at_utc` | TIMESTAMPTZ | NULLABLE; when operator answered                           |
| `neighbor_answered_at_utc` | TIMESTAMPTZ | NULLABLE; when neighbor answered                          |
| `bridged_at_utc`     | TIMESTAMPTZ | NULLABLE; when bridging occurred                                                  |
| `ended_at_utc`       | TIMESTAMPTZ | NULLABLE; when call ended or failed                                               |
| `created_at_utc`     | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                                                            |
| `updated_at_utc`     | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                                                            |

**Indexes:**

* `cs_calls_scope_idx` – `(tenant_id, org_unit_id, person_id, created_at_utc DESC, id)` to list calls by person.
* `cs_calls_thread_idx` – `(tenant_id, org_unit_id, thread_id, created_at_utc DESC, id)` to list calls by thread.

### 5.2 `connectshyft.cs_voicemails` (new)

| Column                  | Type        | Constraints                                         |
|-------------------------|-------------|-----------------------------------------------------|
| `id`                    | TEXT        | Primary key (voicemailId)                          |
| `tenant_id`             | TEXT        | NOT NULL                                           |
| `org_unit_id`           | TEXT        | NOT NULL                                           |
| `call_id`               | TEXT        | NOT NULL; references `cs_calls.id`                 |
| `thread_id`             | TEXT        | NOT NULL                                           |
| `person_id`             | TEXT        | NOT NULL                                           |
| `artifact_id`           | TEXT        | NOT NULL; unique across all voicemails             |
| `recording_url`         | TEXT        | NULLABLE                                           |
| `transcription_json`    | JSONB       | NULLABLE; provider transcription results           |
| `recording_status`      | TEXT        | NOT NULL CHECK (`recording_status` IN ('pending','completed','failed')) |
| `occurred_at_utc`       | TIMESTAMPTZ | NOT NULL                                           |
| `created_at_utc`        | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             |
| `updated_at_utc`        | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             |

**Indexes:**

* `cs_voicemails_scope_idx` – `(tenant_id, org_unit_id, person_id, occurred_at_utc DESC, id)`.
* `cs_voicemails_artifact_idx` – UNIQUE `(tenant_id, artifact_id)` to deduplicate.

### 5.3 `connectshyft.cs_delivery_attempts` (new)

A record of each outbound dispatch (SMS or voice).  For Slice 25 we create the table but only populate it for voice calls.  Future slices will extend SMS delivery tracking.

| Column               | Type        | Constraints                                         |
|----------------------|-------------|-----------------------------------------------------|
| `id`                 | TEXT        | Primary key (deliveryAttemptId)                    |
| `tenant_id`          | TEXT        | NOT NULL                                           |
| `org_unit_id`        | TEXT        | NOT NULL                                           |
| `thread_id`          | TEXT        | NOT NULL                                           |
| `person_id`          | TEXT        | NOT NULL                                           |
| `call_id`            | TEXT        | NULLABLE; present for voice attempts               |
| `channel`            | TEXT        | NOT NULL CHECK (`channel` IN ('sms','voice'))      |
| `provider_event_id`  | TEXT        | NULLABLE; links to `cs_provider_events.id`         |
| `status`             | TEXT        | NOT NULL CHECK (`status` IN ('pending','succeeded','failed','canceled')) |
| `failure_code`       | TEXT        | NULLABLE                                           |
| `failure_message`    | TEXT        | NULLABLE                                           |
| `created_at_utc`     | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             |
| `updated_at_utc`     | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             |

### 5.4 `connectshyft.cs_provider_events` (new)

Stores raw provider events to enable idempotent processing and debugging.

| Column               | Type        | Constraints                                         |
|----------------------|-------------|-----------------------------------------------------|
| `id`                 | TEXT        | Primary key (providerEventId)                      |
| `tenant_id`          | TEXT        | NOT NULL                                           |
| `provider`           | TEXT        | NOT NULL                                           |
| `event_type`         | TEXT        | NOT NULL                                           |
| `event_json`         | JSONB       | NOT NULL; full payload                             |
| `call_id`            | TEXT        | NULLABLE                                           |
| `bridge_session_id`  | TEXT        | NULLABLE                                           |
| `provider_call_id`   | TEXT        | NULLABLE                                           |
| `occurred_at_utc`    | TIMESTAMPTZ | NOT NULL                                           |
| `received_at_utc`    | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                             |

**Unique constraint** – `(tenant_id, provider, event_type, provider_call_id, occurred_at_utc)` to deduplicate.

## 6. SERVICE LAYER (STRICT)

### 6.1 Call Store & Service (new modules)

**File:** `apps/connectshyft-api/src/modules/connectshyft/calls.ts`

The call service encapsulates call creation and updates and persists to the new tables.  It has the following interface:

```ts
export interface CreateCallInput {
  tenantId: string
  orgUnitId: string
  threadId: string
  personId: string
}

export interface UpdateCallStatusInput {
  callId: string
  tenantId: string
  status: CallStatus
  operatorAnsweredAtUtc?: string
  neighborAnsweredAtUtc?: string
  bridgedAtUtc?: string
  endedAtUtc?: string
  failureCode?: string | null
  failureMessage?: string | null
}

export interface ListThreadCallsInput {
  tenantId: string
  orgUnitId: string
  threadId: string
}

export interface ListPersonCallsInput {
  tenantId: string
  orgUnitId: string
  personId: string
}

export interface ConnectShyftCallService {
  createCall(input: CreateCallInput): Promise<Call>
  updateCallStatus(input: UpdateCallStatusInput): Promise<void>
  listThreadCalls(input: ListThreadCallsInput): Promise<Call[]>
  listPersonCalls(input: ListPersonCallsInput): Promise<Call[]>
  getCallById(callId: string, tenantId: string): Promise<Call | null>
}

export type Call = {
  id: string
  tenantId: string
  orgUnitId: string
  threadId: string
  personId: string
  bridgeSessionId: string | null
  status: CallStatus
  failureCode: string | null
  failureMessage: string | null
  startedAtUtc: string
  operatorAnsweredAtUtc: string | null
  neighborAnsweredAtUtc: string | null
  bridgedAtUtc: string | null
  endedAtUtc: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export type CallStatus =
  | 'operator_dialing'
  | 'operator_answered'
  | 'neighbor_dialing'
  | 'neighbor_answered'
  | 'bridged'
  | 'voicemail'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired'
```

The implementation uses `Knex` to insert, update and query the `cs_calls` table.  It does **not** implement business logic; it simply persists state.  The service must throw `ConnectShyftPersistenceUnavailableError` when the database cannot be reached.

### 6.2 Voicemail Store & Service (new modules)

**File:** `apps/connectshyft-api/src/modules/connectshyft/voicemails.ts`

Defines `ConnectShyftVoicemailService` with methods:

```ts
export interface CreateVoicemailInput {
  tenantId: string
  orgUnitId: string
  callId: string
  threadId: string
  personId: string
  artifactId: string
  recordingUrl: string | null
  recordingStatus: 'pending' | 'completed' | 'failed'
  occurredAtUtc: string
  transcriptionJson?: unknown
}

export interface ListCallVoicemailsInput {
  tenantId: string
  callId: string
}

export interface ConnectShyftVoicemailService {
  createVoicemail(input: CreateVoicemailInput): Promise<Voicemail>
  listCallVoicemails(input: ListCallVoicemailsInput): Promise<Voicemail[]>
}

export type Voicemail = {
  id: string
  tenantId: string
  orgUnitId: string
  callId: string
  threadId: string
  personId: string
  artifactId: string
  recordingUrl: string | null
  recordingStatus: 'pending' | 'completed' | 'failed'
  occurredAtUtc: string
  createdAtUtc: string
  updatedAtUtc: string
  transcriptionJson: any | null
}
```

### 6.3 Provider Event Store (new module)

**File:** `apps/connectshyft-api/src/modules/connectshyft/providerEvents.ts`

Defines `ConnectShyftProviderEventService` with methods to record and fetch provider events.  It should expose:

```ts
export interface RecordProviderEventInput {
  tenantId: string
  provider: string
  eventType: string
  eventJson: unknown
  callId?: string | null
  bridgeSessionId?: string | null
  providerCallId?: string | null
  occurredAtUtc: string
}

export interface ConnectShyftProviderEventService {
  recordEvent(input: RecordProviderEventInput): Promise<void>
}
```

### 6.4 Delivery Attempt Service (stub)

Define a basic `ConnectShyftDeliveryAttemptService` to insert records into `cs_delivery_attempts`.  It accepts channel and callId; future slices will add SMS tracking.

### 6.5 Bridge Session Extensions (existing file: `bridgeSessions.ts`)

**Enhancements:**

1. **personId injection** – When creating a bridge session, accept and persist `personId` in the session record.  Add a new column `person_id TEXT NOT NULL` to `cs_bridge_sessions` via migration.  The `StartConnectShyftBridgeSessionInput` should include `personId` (passed from the API).  This ensures sessions remain person‑bound for rebind safety.
2. **Call update hook** – Introduce an internal callback in `bridgeSessions.ts` that fires on every session transition.  The callback receives the new aggregate and uses `connectShyftCallService.updateCallStatus` to synchronize the call status and timestamps.  The callback must run outside of domain state transitions (i.e. after persistence) and be idempotent.
3. **Provider event persistence** – In `handleProviderBridgeEvent`, after computing the updated aggregate, call `providerEventService.recordEvent` with the provider payload and correlation data.

### 6.6 Thread Timeline (modified file: `threadTimeline.ts`)

Extend `resolveBridgeSessionVoicemailProjection` and other helpers to incorporate call and voicemail records.  The timeline builder should fetch calls and voicemails using the call/voicemail services and merge them with existing SMS events into a chronologically sorted list.  Each call appears as a `voice_event` item with subevents (dialing, answered, bridged, voicemail) and associated timestamps.  Each voicemail appears as a `voicemail` item.

### 6.7 HTTP Handlers

Add new handlers under `apps/connectshyft-api/src/modules/connectshyft/handlers`:

* `postThreadCallHandler` – start a call on a thread.
* `getCallHandler` – return a single call.
* `getThreadCallHistoryHandler` – list calls for a thread.
* `getPersonCallHistoryHandler` – list calls for a person.
* `postProviderEventHandler` – ingest provider webhooks, deduplicate and advance the bridge session.  This handler must validate provider signatures and route events using existing `providerRegistry` logic.
* `postVoicemailHandler` – handle voicemail recording events; create voicemail record and update call.

Register these routes in `http/index.ts` with appropriate method and path patterns.  Use existing envelope response helpers for success and failure.

## 7. PROVIDER / INTEGRATION CONTRACTS

The provider registry and adapter interface remain unchanged.  Each provider must implement `startOutboundCall`, `startBridgeSession` and emit provider events defined in `ProviderBridgeEvent`.  New endpoints accept provider webhooks carrying `provider_call_id`, `event_type`, `event_timestamp`, `event_payload`, etc.  A signature verification step is required (already implemented by `resolveConnectShyftProviderAdapter` in Slice 23).  The event service deduplicates events using the unique combination `(tenant_id, provider, provider_call_id, event_type, occurred_at_utc)`.

## 8. EVENT HANDLING

This slice introduces new domain events produced by ConnectShyft.  They are emitted via the existing outbound event system:

* `connectshyft.call.started` – emitted after a call is created and bridge session initiated; payload includes `callId`, `threadId`, `personId`, `occurredAtUtc`.
* `connectshyft.call.updated` – emitted when a call status changes (e.g. answered, bridged, completed, failed).  Includes the new status and timestamps.
* `connectshyft.voicemail.recorded` – emitted after a voicemail is created; includes `voicemailId`, `callId`, `threadId`, `personId`, `recordingUrl`.

Domain events are delivered via the platform’s outbox mechanism and are idempotent; duplicates are suppressed by event IDs.

## 9. IDEMPOTENCY RULES

1. **Call initiation** – Starting a call with the same idempotency key and thread while a call is in progress should return the existing call record and not create a new bridge session.  The `createCall` method must accept an optional `idempotencyKey` and enforce uniqueness per `(tenant_id, thread_id, idempotencyKey)`.
2. **Provider event ingestion** – Events with the same `(tenant_id, provider, provider_call_id, event_type, occurred_at_utc)` are dropped after the first processing.  Duplicate processing does not advance the session or update call status.
3. **Voicemail creation** – If a voicemail with the same `(tenant_id, artifact_id)` already exists, ignore the duplicate webhook.
4. **Call updates** – Updating a call status must be safe to repeat; if the call is already in a later state, ignore older updates.

## 10. FAILURE MODES

1. **Telephony not ready** – If `telephonyReadiness.inspectReadiness` (Slice 23) reports `NOT_READY` or `bridgeCallRunnable = false`, the call start handler must refuse the call with code `CONNECTSHYFT_TELEPHONY_NOT_READY`.  The client should surface the blocking reasons.
2. **Existing active call** – If there is a non‑terminal call on the thread, return a refusal `CONNECTSHYFT_CALL_ALREADY_IN_PROGRESS`.
3. **Provider error** – If provider adapters throw errors when starting a call or bridging, update the call to `failed` with `failureCode = 'provider_error'` and emit a call updated event.
4. **Database unavailable** – All store methods throw `ConnectShyftPersistenceUnavailableError` when the database is unreachable.  Handlers translate this to a 503 envelope.
5. **Webhook verification failed** – If signature verification fails, respond with HTTP 401 and do not persist the provider event.
6. **Invalid thread or person** – If the thread or person cannot be resolved, return a 404 envelope.  Do not create or update any records.

## 11. TEST CONTRACT

### 11.1 Domain Tests (bridge layer)

* Add tests in `domains/communication/bridge/__tests__/callLifecycle.test.ts` verifying that:
  * Starting a call triggers `startBridgeSession` and produces a new call record with status `operator_dialing`.
  * Applying provider events transitions call statuses correctly and idempotently (operator answered, neighbor answered, bridged, completed, failed).
  * Voicemail fallback results in a call with status `voicemail` and a voicemail record.

### 11.2 Service & Store Tests

* `calls.test.ts` – Test `createCall`, `updateCallStatus`, `listThreadCalls`, `listPersonCalls` for correct persistence, idempotency and scope filtering.
* `voicemails.test.ts` – Test voicemail creation and listing, including duplicate artifact handling.
* `providerEvents.test.ts` – Test event deduplication and persistence.

### 11.3 API Integration Tests

Add new integration tests in `tests/integration/connectshyft-api/calls.integration.test.ts`:

1. **Start call** – Sending `POST /api/v1/connectshyft/thread/:threadId/call` starts a call when readiness is true and no call exists.  Response includes `callId` and status `operator_dialing`.
2. **Idempotent start** – Starting a call again with the same idempotency key returns the existing call.
3. **Advance lifecycle** – Simulate provider events to move through `operator_answered → neighbor_answered → bridged → completed` and assert call status updates and timeline projection.
4. **Failure** – Simulate provider failure and verify call status `failed`, failure code and message persisted.
5. **Voicemail** – Simulate voicemail fallback and verify voicemail record creation and call status `voicemail`.
6. **Listing calls** – List calls by thread and by person and ensure ordering and filtering.

## 12. CHECKPOINTS

### Checkpoint 1 — Persist Telephony Artifacts

**FILES:**

1. `shared/database/migrations/20260325100000_create_connectshyft_calls_and_voicemail.ts` – migration creating `cs_calls`, `cs_voicemails`, `cs_delivery_attempts` and `cs_provider_events` tables as specified in §5.  Also add `person_id` column to `cs_bridge_sessions` and appropriate index.
2. `apps/connectshyft-api/src/modules/connectshyft/calls.ts` – new call service and store implementation using Knex.
3. `apps/connectshyft-api/src/modules/connectshyft/voicemails.ts` – new voicemail service and store implementation.
4. `apps/connectshyft-api/src/modules/connectshyft/providerEvents.ts` – new provider event service implementation.
5. `apps/connectshyft-api/src/modules/connectshyft/deliveryAttempts.ts` – new delivery attempt service stub.
6. `apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts` – modify session creation to accept `personId` and persist it; introduce call update hook and provider event recording as described in §6.5.
7. `apps/connectshyft-api/src/migrations/20260325101000_add_person_id_to_connectshyft_bridge_sessions.ts` – migration adding `person_id` column to `cs_bridge_sessions` with NOT NULL default using thread’s person.

**FUNCTION SIGNATURES:**

* Extend `StartConnectShyftBridgeSessionInput` in `bridgeSessions.ts` to include `personId: string`.
* Add `idempotencyKey?: string` to call creation inputs.
* Add call update callback signature to `startBridgeSession` invocation (internal only).

**LINE‑LEVEL DIFF EXPECTATIONS:**

Migration example:

```diff
*** Begin Migration: shared/database/migrations/20260325100000_create_connectshyft_calls_and_voicemail.ts
import { Knex } from 'knex'

const CONNECTSHYFT = 'connectshyft'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS ${CONNECTSHYFT}`)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT}.cs_calls (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      bridge_session_id TEXT NULL REFERENCES ${CONNECTSHYFT}.cs_bridge_sessions(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN (
        'operator_dialing','operator_answered','neighbor_dialing','neighbor_answered','bridged','voicemail','completed','failed','canceled','expired'
      )),
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      started_at_utc TIMESTAMPTZ NOT NULL,
      operator_answered_at_utc TIMESTAMPTZ NULL,
      neighbor_answered_at_utc TIMESTAMPTZ NULL,
      bridged_at_utc TIMESTAMPTZ NULL,
      ended_at_utc TIMESTAMPTZ NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await knex.raw(`CREATE INDEX IF NOT EXISTS connectshyft_cs_calls_scope_idx ON ${CONNECTSHYFT}.cs_calls (tenant_id, org_unit_id, person_id, created_at_utc DESC, id)`)
  await knex.raw(`CREATE INDEX IF NOT EXISTS connectshyft_cs_calls_thread_idx ON ${CONNECTSHYFT}.cs_calls (tenant_id, org_unit_id, thread_id, created_at_utc DESC, id)`)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT}.cs_voicemails (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      call_id TEXT NOT NULL REFERENCES ${CONNECTSHYFT}.cs_calls(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      recording_url TEXT NULL,
      transcription_json JSONB NULL,
      recording_status TEXT NOT NULL CHECK (recording_status IN ('pending','completed','failed')),
      occurred_at_utc TIMESTAMPTZ NOT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_voicemails_artifact_uq UNIQUE (tenant_id, artifact_id)
    )
  `)

  await knex.raw(`CREATE INDEX IF NOT EXISTS connectshyft_cs_voicemails_scope_idx ON ${CONNECTSHYFT}.cs_voicemails (tenant_id, org_unit_id, person_id, occurred_at_utc DESC, id)`)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT}.cs_delivery_attempts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      org_unit_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      call_id TEXT NULL REFERENCES ${CONNECTSHYFT}.cs_calls(id) ON DELETE SET NULL,
      channel TEXT NOT NULL CHECK (channel IN ('sms','voice')),
      provider_event_id TEXT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','canceled')),
      failure_code TEXT NULL,
      failure_message TEXT NULL,
      created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ${CONNECTSHYFT}.cs_provider_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_json JSONB NOT NULL,
      call_id TEXT NULL,
      bridge_session_id TEXT NULL,
      provider_call_id TEXT NULL,
      occurred_at_utc TIMESTAMPTZ NOT NULL,
      received_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cs_provider_events_dedup_uq UNIQUE (tenant_id, provider, provider_call_id, event_type, occurred_at_utc)
    )
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema(CONNECTSHYFT).dropTableIfExists('cs_provider_events')
  await knex.schema.withSchema(CONNECTSHYFT).dropTableIfExists('cs_delivery_attempts')
  await knex.schema.withSchema(CONNECTSHYFT).dropTableIfExists('cs_voicemails')
  await knex.schema.withSchema(CONNECTSHYFT).dropTableIfExists('cs_calls')
}
*** End Migration
```

Modify `bridgeSessions.ts` to accept `personId` and persist it in `cs_bridge_sessions`.  Introduce a call update hook at the end of `startBridgeSession` and `handleProviderBridgeEvent`:

```diff
@@ function startBridgeSession(
   const sessionId = randomUUID()
   const session: BridgeSessionRecord = {
     id: sessionId,
     tenantId: input.tenantId,
     orgUnitId: input.orgUnitId,
     threadId: input.threadId,
     operatorParticipantId: input.operatorParticipantId,
     neighborParticipantId: input.neighborParticipantId,
     operatorContactPointId: input.operatorContactPointId,
     neighborContactPointId: input.neighborContactPointId,
     selectedOutboundContactPointId: input.selectedOutboundContactPointId ?? null,
     status: 'created',
     failureCode: null,
     failureMessage: null,
     endedBy: null,
     idempotencyKey: input.idempotencyKey ?? null,
     auditCorrelationId: input.auditCorrelationId ?? null,
     createdAt: new Date(),
     updatedAt: new Date(),
     completedAt: null,
     personId: input.personId, // new field
   }
@@
   await repository.createSession(session)
   await repository.createLeg(operatorLeg)
   await repository.createLeg(neighborLeg)

   // NEW: update call status after session creation
   await callService.updateCallStatus({
     callId: input.callId!,
     tenantId: input.tenantId,
     status: 'operator_dialing',
     startedAtUtc: new Date().toISOString(),
   })

***
```

Similar diff applies to `handleProviderBridgeEvent`: after persisting the updated aggregate, call `callService.updateCallStatus` with the new status and timestamps.

**DATA MUTATIONS:**

* Adding new tables and columns will not mutate existing records.  Existing bridge sessions gain a `person_id` column; migration populates it by joining threads to persons via existing foreign keys.

**GUARDS:**

* The migration must populate `person_id` on existing `cs_bridge_sessions` by joining `cs_threads.thread_id` to `cs_threads.person_id` (threads now carry `personId`).  If any sessions cannot resolve a person, abort migration.

**STOP CONDITION:**

Run the new migrations with `pnpm nx run migration-runner` and verify that tables `cs_calls`, `cs_voicemails`, `cs_delivery_attempts` and `cs_provider_events` exist and that `cs_bridge_sessions` has a non‑null `person_id` column.  PeopleCore and ConnectShyft tests should compile with the new service interfaces.

**COMMIT POINT:**

```bash
git add shared/database/migrations/20260325100000_create_connectshyft_calls_and_voicemail.ts \
        apps/connectshyft-api/src/modules/connectshyft/calls.ts \
        apps/connectshyft-api/src/modules/connectshyft/voicemails.ts \
        apps/connectshyft-api/src/modules/connectshyft/providerEvents.ts \
        apps/connectshyft-api/src/modules/connectshyft/deliveryAttempts.ts \
        apps/connectshyft-api/src/modules/connectshyft/bridgeSessions.ts \
        apps/connectshyft-api/src/migrations/20260325101000_add_person_id_to_connectshyft_bridge_sessions.ts
git commit -m "feat(connectshyft): persist telephony artifacts and person id on bridge sessions"
```

### Checkpoint 2 — Call Lifecycle Service & Provider Event Processing

**FILES:**

1. `apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts` – new service that orchestrates call creation, session start, provider event handling, call status updates, voicemail creation and event emission.  It composes the call service, voicemail service, delivery attempt service, provider event service and bridge session domain.
2. `apps/connectshyft-api/src/modules/connectshyft/handlers/postThreadCallHandler.ts` – start call endpoint.
3. `apps/connectshyft-api/src/modules/connectshyft/handlers/postProviderEventHandler.ts` – provider webhook endpoint.
4. `apps/connectshyft-api/src/modules/connectshyft/handlers/postVoicemailHandler.ts` – voicemail webhook endpoint.
5. `apps/connectshyft-api/src/modules/connectshyft/http/index.ts` – route registration.
6. `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts` – update timeline projection logic to include call and voicemail records.
7. Test files: `callLifecycle.test.ts`, `postThreadCallHandler.test.ts`, `postProviderEventHandler.test.ts`, `postVoicemailHandler.test.ts`.

**FUNCTION SIGNATURES:**

* `async startCall(input: { tenantId: string; orgUnitId: string; threadId: string; personId: string; idempotencyKey?: string; actorRoles: string[]; }): Promise<Call>`
* `async handleProviderEvent(input: { tenantId: string; provider: string; event: ProviderBridgeEvent; eventJson: unknown; providerCallId?: string | null; occurredAt: Date; }): Promise<void>`
* `async handleVoicemail(input: { tenantId: string; orgUnitId: string; callId: string; threadId: string; personId: string; artifactId: string; recordingUrl: string | null; recordingStatus: 'pending' | 'completed' | 'failed'; occurredAt: Date; transcriptionJson?: unknown; }): Promise<void>`

**LINE‑LEVEL DIFF EXPECTATIONS:**

Handler registration example:

```diff
*** Update File: apps/connectshyft-api/src/modules/connectshyft/http/index.ts
@@
 import { postThreadCallHandler } from '../handlers/postThreadCallHandler'
 import { postProviderEventHandler } from '../handlers/postProviderEventHandler'
 import { postVoicemailHandler } from '../handlers/postVoicemailHandler'
@@
 router.post('/api/v1/connectshyft/thread/:threadId/call', postThreadCallHandler)
 router.post('/api/v1/connectshyft/provider-events', postProviderEventHandler)
 router.post('/api/v1/connectshyft/voicemails', postVoicemailHandler)
*** End Patch
```

**REQUIRED CHANGES:**

* Implement call lifecycle service to orchestrate call start and provider event processing.  This service must call the bridge domain, persist call/voicemail, update statuses and emit domain events via the platform outbox.  It must enforce idempotency by checking existing calls with the same idempotency key and existing provider events.
* Update thread timeline builder to include call and voicemail items.  Use call service to list calls by thread and include them as `voice_event` with nested status events; include voicemails as `voicemail` items with recording URL.

**DATA MUTATIONS:**

* Starting a call inserts into `cs_calls` and updates `cs_bridge_sessions.person_id` (if not already set).  Provider events update `cs_calls` and insert into `cs_provider_events`.  Voicemail events insert into `cs_voicemails` and update `cs_calls`.

**GUARDS:**

* The call start handler must verify telephony readiness and no active call on the thread.  Use call service to check for non‑terminal calls with status not in (`completed`,`failed`,`canceled`,`expired`,`voicemail`).
* Provider events must be verified using the provider registry and signature check (Slice 23).  Invalid signatures return 401.
* Voicemail handler must ensure the call exists and is in a state eligible for voicemail (status `failed` or `neighbor_failed`).

**STOP CONDITION:**

* Unit tests for call lifecycle service, provider event handler and voicemail handler should pass.
* Integration tests should demonstrate end‑to‑end call lifecycle transitions through the API with simulated provider events.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/connectshyft/callLifecycle.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/postThreadCallHandler.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/postProviderEventHandler.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/postVoicemailHandler.ts \
        apps/connectshyft-api/src/modules/connectshyft/http/index.ts \
        apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts \
        apps/connectshyft-api/src/modules/connectshyft/__tests__/callLifecycle.test.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/__tests__/postThreadCallHandler.test.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/__tests__/postProviderEventHandler.test.ts \
        apps/connectshyft-api/src/modules/connectshyft/handlers/__tests__/postVoicemailHandler.test.ts \
        tests/integration/connectshyft-api/calls.integration.test.ts
git commit -m "feat(connectshyft): implement call lifecycle service and provider event handling"
```

### Checkpoint 3 — Timeline Projection & Domain Events

**FILES:**

1. `apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts` – finalize timeline projection logic to merge call and voicemail records with existing SMS timeline items.
2. `apps/connectshyft-api/src/modules/connectshyft/events.ts` – implement domain event emission for `call.started`, `call.updated` and `voicemail.recorded` using the platform outbox pattern.
3. Integration tests verifying that timeline projection correctly orders SMS, call and voicemail events.
4. Update `readContracts.ts` to include new fields (`callIndicator`, `voicemailIndicator`, `callLabel`, etc.) on thread summary responses.

**REQUIRED CHANGES:**

* Extend thread read contract to indicate whether there are unread calls or voicemails and to include a call/voicemail section on the detail view.  The contract must not leak provider identifiers.
* Emit domain events at appropriate points in call lifecycle service (start, update, voicemail).  Domain events are written to the platform’s outbox table via existing event publisher functions.

**STOP CONDITION:**

* Integration tests demonstrate that thread timeline returns call and voicemail events in correct order with expected fields.  Event logs show domain events being emitted when calls start, update and voicemail are recorded.

**COMMIT POINT:**

```bash
git add apps/connectshyft-api/src/modules/connectshyft/threadTimeline.ts \
        apps/connectshyft-api/src/modules/connectshyft/events.ts \
        apps/connectshyft-api/src/modules/connectshyft/readContracts.ts \
        apps/connectshyft-api/src/modules/connectshyft/__tests__/threadTimeline.test.ts \
        tests/integration/connectshyft-api/calls.timeline.integration.test.ts
git commit -m "feat(connectshyft): unify thread timeline with calls and voicemail and emit call events"
```

## 13. DEFINITION OF DONE

1. New tables `cs_calls`, `cs_voicemails`, `cs_delivery_attempts`, `cs_provider_events` exist and store telephony artifacts.  `cs_bridge_sessions` includes `person_id`.
2. Call lifecycle service can start a call, advance its status via provider events, record voicemail and emit domain events.
3. Provider event ingestion is idempotent and deduplicated.  Voicemail events create `cs_voicemails` rows and update call status.
4. Thread timeline returns call and voicemail items in chronological order alongside SMS events; read contracts include call/voicemail indicators.
5. Telephony remains person‑bound and rebind‑safe: all call and voicemail records carry `personId` and are unaffected by thread rebinding.
6. All new unit and integration tests pass.  No regressions in existing bridge or telephony tests.
7. The implementation adheres to the locked architecture: no redesign of provider adapters or bridge state machine; no UI changes; minimal surgical edits to existing files.

## 14. NON‑GOALS

* Implementing front‑end UI for telephony; that is deferred to a subsequent slice.  This slice only exposes data for the UI to consume.
* Designing new provider features or multi‑provider call routing; provider logic remains unchanged.
* Handling SMS delivery attempts; `cs_delivery_attempts` is created but SMS tracking is deferred to later slices.
* Merging call logs across threads or persons; call history remains scoped to a thread or person separately.
* Redesigning the domain bridge state machine; the existing state machine is reused.

## 15. FUTURE EXTENSION POINTS

1. **SMS delivery tracking** – Populate `cs_delivery_attempts` for SMS sends and unify SMS events into the communication timeline.
2. **Call recordings** – Store call recordings and transcription beyond voicemail, including two‑party conversations when both parties consent.
3. **Real‑time call control** – Implement APIs for pausing, transferring or ending calls mid‑session and surface call control to operators.
4. **Analytics** – Build dashboards and reports summarizing call durations, answer rates, voicemail rates and failure codes across tenants and orgUnits.
5. **Provider abstraction** – Support multiple telephony providers with dynamic selection and fail‑over; unify provider event mapping for multiple vendors.
