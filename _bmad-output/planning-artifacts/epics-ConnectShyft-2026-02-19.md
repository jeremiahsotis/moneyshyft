---
stepsCompleted: [1, 2, 3, 4]
project_lane: connectshyft
inputDocuments:
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md
  - /Users/jeremiahotis/moneyshyft/_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md
---

# ConnectShyft - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ConnectShyft, decomposing requirements from the PRD, Architecture, and UX specification into implementation-ready stories with testable acceptance criteria.

## Requirements Inventory

### Functional Requirements

FR-CS-001: Every authenticated ConnectShyft request must resolve a valid tenant context.
FR-CS-002: OrgUnit context is mandatory for orgUnit-scoped endpoints.
FR-CS-003: OrgUnit context must be validated against tenant and caller membership unless tenant-privileged.
FR-CS-004: Neighbor registry is tenant-scoped.
FR-CS-004a: Neighbor identity fields are tenant-scoped and shared across orgUnits; updates are immediately visible across orgUnits within the same tenant.
FR-CS-005: Threads/messages/voicemails are orgUnit-scoped.
FR-CS-006: Neighbor create/update must persist tenant scope.
FR-CS-007: Neighbor create requires at least one phone.
FR-CS-008: Neighbor edits are allowed only for users with active thread relationship in current orgUnit or tenant-privileged role.
FR-CS-008a: Neighbor edits must be performed under explicit orgUnit context and must include originating `org_unit_id` in audit event metadata.
FR-CS-009: Neighbor merge operations are role-restricted and audited.
FR-CS-010: Shared-phone flags are explicit and persisted per phone entry.
FR-CS-011: Exactly one active thread may exist per `(tenant_id, org_unit_id, neighbor_id)`.
FR-CS-012: `POST /api/v1/connectshyft/threads` must return existing active thread when present; otherwise create.
FR-CS-013: Canonical thread state enum is `UNCLAIMED | CLAIMED | CLOSED`.
FR-CS-014: Escalation progression follows `X -> 2X -> 3X`, where default `X = 24 hours` and orgUnit-configurable range is `1-24 hours` (integer hours only).
FR-CS-015: Escalation resets only on explicit claim and cancels pending escalation notifications.
FR-CS-016: Outbound attempts without claim must not reset escalation.
FR-CS-017: Thread supports metadata fields `last_inbound_cs_number_id` and `preferred_outbound_cs_number_id` (or derived outbound selection from orgUnit config).
FR-CS-018: Inbound SMS webhook appends message and ensures active thread.
FR-CS-019: Inbound voice webhook creates voicemail artifact and transcription request.
FR-CS-020: Transcription webhook attaches transcript to voicemail record.
FR-CS-021: All Twilio webhooks must validate signatures before processing.
FR-CS-021a: Webhook handlers must implement replay-safe idempotency using Twilio SID keys (message/call/transcription) to prevent duplicate processing.
FR-CS-022: `prefers_texting` enum values must be `UNKNOWN | YES | NO`.
FR-CS-023: Outbound SMS when `NO` requires override reason; override is persisted and audited.
FR-CS-024: Critical state transitions and governance actions emit audit/outbox records.
FR-CS-025: OrgUnit supports multiple mapped Twilio numbers.
FR-CS-026: Number mapping uniqueness is enforced per tenant for phone number.
FR-CS-027: OrgUnit escalation config supports integer-hour `X` baseline (default 24, range 1-24) and recipient targets.

### NonFunctional Requirements

NFR-CS-001: Strict tenant isolation on all data access paths.
NFR-CS-002: OrgUnit-scoped enforcement for operational records.
NFR-CS-003: Twilio webhook signature validation is mandatory.
NFR-CS-004: Immutable audit trail for critical actions.
NFR-CS-005: Deterministic inbound routing from number mapping.
NFR-CS-006: Idempotent thread ensure behavior.
NFR-CS-007: Webhook replay protection must ensure duplicate Twilio SID events do not create duplicate messages, voicemails, or thread transitions.
NFR-CS-008: Escalation evaluation must be event-scheduled per thread using persisted `next_evaluation_at_utc`; no in-memory timers.
NFR-CS-009: Escalation engine behavior must remain consistent across retries and process restarts.
NFR-CS-010: No silent state transitions outside audited paths.
NFR-CS-011: Inbox list and thread detail endpoint responses must meet `p95 <= 750ms` and `p99 <= 1500ms` under expected operational load.
NFR-CS-012: Webhook ingestion (signature validation, dedupe, durable write acceptance) must meet `p95 <= 1000ms` and `p99 <= 2000ms`; end-to-end thread timeline visibility target is `p95 <= 5000ms`.
NFR-CS-013: Retention compliance for communication artifacts.
NFR-CS-014: Unauthorized cross-conference sharing is technically blocked.

### Additional Requirements

- API responses must follow shared envelope semantics (`success`, `refusal`, `error`).
- ConnectShyft runs as a bounded module under `src/src/modules/connectshyft` with no direct imports to or from RouteShyft.
- ConnectShyft data lives in Postgres schema `connectshyft` with `cs_*` tables and additive-first migrations.
- Active thread uniqueness is enforced by partial unique index on `(tenant_id, org_unit_id, neighbor_id)` where state is not `CLOSED`.
- Webhook idempotency must use `connectshyft.cs_webhook_receipts` keyed by `(tenant_id, provider, sid, event_type)`.
- Feature flags default OFF in production and support kill-switch behavior (`connectshyft_enabled` + sub-flags).
- Policy gate `npm run policy:check` is first blocking CI stage; RouteShyft regression lane is mandatory on ConnectShyft PRs.
- Branch workflow guard command is mandatory before story/epic execution.
- UX constraints are mandatory: explicit tenant/orgUnit visibility, deterministic inbox sorting, claim-only escalation reset copy, and refusal-style permission feedback.
- Accessibility and responsive constraints are mandatory: WCAG 2.2 AA baseline, keyboard-first inbox/thread actions, tablet fallback, and mobile thread execution support.

### FR Coverage Map

FR-CS-001: Epic a, Story a.2
FR-CS-002: Epic a, Story a.2
FR-CS-003: Epic a, Story a.2
FR-CS-004: Epic b, Story b.1
FR-CS-004a: Epic b, Story b.2
FR-CS-005: Epic c, Story c.3
FR-CS-006: Epic b, Story b.1
FR-CS-007: Epic b, Story b.1
FR-CS-008: Epic b, Story b.3
FR-CS-008a: Epic b, Story b.3
FR-CS-009: Epic b, Story b.4
FR-CS-010: Epic b, Story b.2
FR-CS-011: Epic c, Story c.2
FR-CS-012: Epic c, Story c.2
FR-CS-013: Epic c, Story c.4
FR-CS-014: Epic c, Story c.5
FR-CS-015: Epic c, Story c.5
FR-CS-016: Epic d, Story d.1
FR-CS-017: Epic c, Story c.3
FR-CS-018: Epic e, Story e.2
FR-CS-019: Epic e, Story e.3
FR-CS-020: Epic e, Story e.4
FR-CS-021: Epic e, Story e.1
FR-CS-021a: Epic e, Story e.5
FR-CS-022: Epic d, Story d.2
FR-CS-023: Epic d, Story d.2
FR-CS-024: Epic d, Story d.3
FR-CS-025: Epic a, Story a.3
FR-CS-026: Epic a, Story a.3
FR-CS-027: Epic a, Story a.4

### Story Dependency Map (Parallel-Safe)

- `a.2` depends on `a.1`
- `a.3` depends on `a.1`, `a.2`
- `a.4` depends on `a.1`, `a.2`
- `a.5` depends on `a.2`
- `b.1` depends on `a.2`
- `b.2` depends on `b.1`
- `b.3` depends on `b.1`, `c.3`
- `b.4` depends on `b.3`
- `c.2` depends on `c.1`
- `c.3` depends on `c.2`
- `c.4` depends on `c.2`, `c.3`
- `c.5` depends on `c.4`, `a.4`
- `d.1` depends on `c.3`
- `d.2` depends on `c.3`
- `d.3` depends on `d.1`, `d.2`
- `d.4` depends on `c.3`, `d.1`, `d.2`
- `e.2` depends on `e.1`, `c.2`
- `e.3` depends on `e.1`, `c.2`
- `e.4` depends on `e.3`
- `e.5` depends on `e.1`
- `e.6` depends on `a.5`, `e.1`, `e.5`

## Epic List

### Epic a: Scoped Access and Operational Configuration
Enable tenant and orgUnit administrators to safely activate ConnectShyft, enforce scope boundaries, and configure numbers/escalation rules.
**FRs covered:** FR-CS-001, FR-CS-002, FR-CS-003, FR-CS-025, FR-CS-026, FR-CS-027

### Epic b: Neighbor Identity Governance
Enable operators to create and manage tenant-scoped neighbor identity records with policy-safe edit and merge controls.
**FRs covered:** FR-CS-004, FR-CS-004a, FR-CS-006, FR-CS-007, FR-CS-008, FR-CS-008a, FR-CS-009, FR-CS-010

### Epic c: OrgUnit Inbox and Thread Lifecycle
Enable orgUnit communication operations with deterministic thread identity, claim semantics, and escalation progression.
**FRs covered:** FR-CS-005, FR-CS-011, FR-CS-012, FR-CS-013, FR-CS-014, FR-CS-015, FR-CS-017

### Epic d: Policy-Safe Outbound Communication
Enable outbound SMS/call execution that preserves escalation semantics, preference policy controls, and auditable refusal behavior.
**FRs covered:** FR-CS-016, FR-CS-022, FR-CS-023, FR-CS-024

### Epic e: Inbound Webhook Reliability and Voicemail Continuity
Enable secure, idempotent Twilio ingestion for SMS/voice/transcription with replay safety and parallel-delivery quality gates.
**FRs covered:** FR-CS-018, FR-CS-019, FR-CS-020, FR-CS-021, FR-CS-021a

## Epic a: Scoped Access and Operational Configuration

Enable tenant and orgUnit administrators to safely activate ConnectShyft, enforce scope boundaries, and configure numbers/escalation rules.

### Story a.1: ConnectShyft Feature Flag and Availability Guardrails

As a tenant administrator,
I want ConnectShyft to be controlled by module and sub-feature flags,
So that rollout can be safely enabled, limited, or reversed without deployment changes.

**Acceptance Criteria:**

**Given** ConnectShyft feature flags are disabled
**When** a user tries to access ConnectShyft routes or UI surfaces
**Then** the system fails closed with controlled unavailable/refusal responses
**And** enabling only selected sub-flags exposes only those enabled capabilities with explicit operator messaging.

### Story a.2: Tenant and OrgUnit Context Enforcement for ConnectShyft Routes

As a platform engineer,
I want every ConnectShyft request to resolve and validate tenant/orgUnit context,
So that orgUnit-scoped operations cannot leak across tenant or membership boundaries.

**FRs:** FR-CS-001, FR-CS-002, FR-CS-003

**Acceptance Criteria:**

**Given** an authenticated request to an orgUnit-scoped ConnectShyft endpoint
**When** context middleware executes
**Then** tenant and orgUnit context are resolved and validated against caller membership (unless tenant-privileged)
**And** requests with missing, invalid, or cross-tenant orgUnit context return refusal responses with no data leakage.

### Story a.3: OrgUnit Number Mapping Management

As an orgUnit administrator,
I want to manage multiple Twilio numbers per orgUnit with tenant-safe uniqueness rules,
So that inbound routing is deterministic and operationally maintainable.

**FRs:** FR-CS-025, FR-CS-026

**Acceptance Criteria:**

**Given** an orgUnit admin creates or updates number mappings
**When** they save valid Twilio E.164 numbers
**Then** multiple mappings per orgUnit are supported
**And** duplicate `(tenant_id, twilio_number_e164)` attempts are blocked with actionable validation feedback.

### Story a.4: Escalation Baseline and Recipient Configuration

As an orgUnit administrator,
I want to configure escalation baseline `X` in integer hours and recipient targets,
So that unclaimed threads escalate to the correct recipients at defined intervals.

**FRs:** FR-CS-027

**Acceptance Criteria:**

**Given** an orgUnit admin updates escalation settings
**When** baseline and recipients are submitted
**Then** configuration is persisted with validation for required recipients and valid integer-hour timings (`X` default 24, allowed 1-24)
**And** invalid recipient assignments are blocked with deterministic refusal messaging.

### Story a.5: Capability-Based Route Access and Envelope Contract Compliance

As a tenant operations lead,
I want capability checks and response envelopes to be consistent across ConnectShyft APIs,
So that client behavior is predictable and unauthorized operations are safely refused.

**FRs:** FR-CS-001, FR-CS-002, FR-CS-003
**NFRs:** NFR-CS-001, NFR-CS-002, NFR-CS-004
**Depends On:** Story 1.2
**Parallel Lane:** lane-a-platform-guards

**Acceptance Criteria:**

**Given** users with different role capabilities call ConnectShyft APIs
**When** authorization and response serialization execute
**Then** permission checks are enforced server-side at endpoint and service boundaries
**And** all responses use shared `success/refusal/error` envelope semantics.

## Epic b: Neighbor Identity Governance

Enable operators to create and manage tenant-scoped neighbor identity records with policy-safe edit and merge controls.

### Story b.1: Tenant-Scoped Neighbor Creation with Required Phone

As an orgUnit member,
I want to create neighbors with at least one phone number in tenant scope,
So that communications can be started with valid contact records.

**FRs:** FR-CS-004, FR-CS-006, FR-CS-007

**Acceptance Criteria:**

**Given** an authorized user submits neighbor data
**When** create neighbor is requested
**Then** neighbor identity is stored tenant-scoped
**And** the request is refused when no phone is provided
**And** accepted records include at least one valid phone entry.

### Story b.2: Shared Tenant Identity and Shared-Phone Indicators

As an operator working across orgUnits in one tenant,
I want neighbor identity updates and shared-phone markers to be consistently visible,
So that contact context remains aligned across operational teams.

**FRs:** FR-CS-004a, FR-CS-010

**Acceptance Criteria:**

**Given** neighbor identity or phone metadata is updated in one orgUnit context
**When** another authorized orgUnit in the same tenant loads the neighbor profile
**Then** shared tenant identity updates are immediately visible
**And** each phone entry renders persisted shared-phone indicators consistently.

### Story b.3: Relationship-Gated Neighbor Edits with Provenance Audit

As an orgUnit identity lead,
I want neighbor edits to require relationship-based permission and orgUnit provenance logging,
So that sensitive identity updates remain governed and auditable.

**FRs:** FR-CS-008, FR-CS-008a

**Acceptance Criteria:**

**Given** a user attempts to edit a neighbor
**When** authorization is evaluated
**Then** edits are permitted only for active-thread relationship users in current orgUnit or tenant-privileged roles
**And** successful edits include originating `org_unit_id` metadata in audit/outbox events.

### Story b.4: Role-Restricted Neighbor Merge with Irreversible Confirmation

As a tenant operations lead,
I want merge actions to be restricted and audited with explicit irreversible confirmation,
So that high-impact identity operations are deliberate and traceable.

**FRs:** FR-CS-009, FR-CS-024

**Acceptance Criteria:**

**Given** a user initiates neighbor merge
**When** merge permissions and confirmation checks run
**Then** only authorized roles can complete the merge after explicit irreversible confirmation
**And** merge outcomes emit audit/outbox records with before/after identifiers.

## Epic c: OrgUnit Inbox and Thread Lifecycle

Enable orgUnit communication operations with deterministic thread identity, claim semantics, and escalation progression.

### Story c.1: Core ConnectShyft Thread Schema and Lifecycle Constraints

As a backend engineer,
I want core ConnectShyft thread tables and indexes created with canonical constraints,
So that thread lifecycle behavior is enforced at the persistence layer.

**FRs:** FR-CS-011, FR-CS-013, FR-CS-017

**Acceptance Criteria:**

**Given** ConnectShyft lifecycle migrations are applied
**When** thread entities are created or updated
**Then** canonical state enum `UNCLAIMED | CLAIMED | CLOSED` and required metadata fields are present
**And** partial unique constraint and scheduler indexes enforce one active thread per `(tenant_id, org_unit_id, neighbor_id)` with performant due-thread scans.

### Story c.2: Thread Ensure Endpoint with Conflict-Safe Idempotency

As an orgUnit operator,
I want creating/opening a thread to return the existing active thread when one already exists,
So that duplicate active threads are never created for the same neighbor context.

**FRs:** FR-CS-011, FR-CS-012

**Acceptance Criteria:**

**Given** concurrent requests to `POST /api/v1/connectshyft/threads` for the same `(tenant_id, org_unit_id, neighbor_id)`
**When** ensure logic executes under uniqueness constraints
**Then** exactly one active thread exists
**And** all conflicting requests return the same active thread instance instead of creating duplicates.

### Story c.3: Inbox and Thread Detail Read Contracts

As an orgUnit member,
I want inbox and thread detail endpoints to return orgUnit-scoped communication records with deterministic ordering and metadata,
So that I can triage and act without ambiguity.

**FRs:** FR-CS-005, FR-CS-017

**Acceptance Criteria:**

**Given** a user fetches inbox or thread detail in an active orgUnit context
**When** records are returned
**Then** results are scoped to that orgUnit and include required metadata (`last_inbound_cs_number_id`, preferred outbound number context)
**And** inbox ordering follows deterministic server ordering:
  - `ORDER BY priority_rank ASC, last_activity_at_utc DESC, thread_id ASC`
  - `priority_rank` mapping: `stage>=3 -> 1`, `stage=2 -> 2`, `stage=1 -> 3`, `new_unread -> 4`, `other -> 5`.

**Given** urgency states are rendered in the UI
**When** the thread list is displayed
**Then** urgency labels map to user language and not raw engine stages:
  - stage 0 -> no label
  - stage 1 -> Needs attention soon
  - stage 2+ -> Needs urgent attention.

**Given** voicemail is received on a CLAIMED thread
**When** Mine and Inbox views are refreshed
**Then** the claimed thread remains in Mine
**And** voicemail indicators are shown on the Mine card (dot/icon)
**And** voicemail does not force the thread back into Inbox.

**Given** thread detail is rendered by canonical state
**When** action controls are displayed
**Then** state-specific action sets are enforced:
  - UNCLAIMED: Call, Text, Claim
  - CLAIMED: Call, Text, Close
  - CLOSED: Call, Send Message.

### Story c.4: Claim, Takeover, and Close Lifecycle Actions

As an orgUnit operator,
I want claim/takeover/close actions to enforce canonical transitions and ownership governance,
So that lifecycle actions remain predictable and auditable.

**FRs:** FR-CS-013, FR-CS-015

**Acceptance Criteria:**

**Given** an authorized lifecycle action request (`claim`, `takeover`, `close`)
**When** transition rules execute
**Then** only valid canonical state transitions are allowed and ownership changes are enforced by policy
**And** each successful transition emits audit/outbox records with actor, orgUnit, prior state, and new state.

**Given** a thread is `CLOSED`
**When** outbound call tap or outbound message tap is initiated
**Then** the same thread reopens immediately as `UNCLAIMED` (no new thread creation)
**And** `thread_reopened_by_user` is emitted
**And** escalation and inactivity reset fields are updated according to locked lifecycle rules.

**Given** a thread is `CLOSED`
**When** inbound voice or fallback intake events arrive
**Then** the thread does not auto-reopen
**And** intake fallback + timeline/audit behavior follows locked routing rules.

### Story c.5: Deterministic Escalation Scheduler with Claim-Only Reset

As a tenant staff escalation responder,
I want escalation progression to run deterministically and reset only on claim,
So that unclaimed threads escalate predictably and operational ownership is explicit.

**FRs:** FR-CS-014, FR-CS-015

**Acceptance Criteria:**

**Given** unclaimed threads have persisted `next_evaluation_at_utc` values
**When** scheduler evaluation runs
**Then** escalation progresses `X -> 2X -> 3X` using persisted timestamps with no in-memory timers, where `X` is integer hours (default 24, allowed 1-24)
**And** explicit claim resets escalation and cancels pending escalation notifications.

## Epic d: Policy-Safe Outbound Communication

Enable outbound SMS/call execution that preserves escalation semantics, preference policy controls, and auditable refusal behavior.

### Story d.1: Outbound SMS/Call Actions that Preserve Escalation Semantics

As an orgUnit operator,
I want to send SMS or place calls from active threads without implicitly resetting escalation,
So that escalation behavior stays policy-compliant until explicit claim occurs.

**FRs:** FR-CS-016

**Acceptance Criteria:**

**Given** an authorized user sends outbound SMS or call actions
**When** the thread is `UNCLAIMED`
**Then** outbound actions execute without changing escalation stage or reset state
**And** system behavior and operator feedback explicitly indicate escalation continues until claim.

**Given** an authorized user initiates outbound action from a `CLOSED` thread
**When** the action starts
**Then** the thread reopens immediately (`CLOSED -> UNCLAIMED`) on the same thread id
**And** `thread_reopened_by_user` is emitted
**And** escalation/inactivity reset behavior is applied before outbound execution.

**Given** an outbound call action is initiated
**When** call orchestration starts
**Then** the implementation uses bridge-call flow only (no WebRTC/SIP/softphone path)
**And** no automatic redial/retry loops occur
**And** successful `CONNECTED` events auto-claim unclaimed threads.

### Story d.2: Preference Override Enforcement for Outbound SMS

As an operator,
I want outbound SMS to require override reasoning when `prefers_texting=NO`,
So that policy exceptions are explicit, justified, and traceable.

**FRs:** FR-CS-022, FR-CS-023

**Acceptance Criteria:**

**Given** a thread where neighbor `prefers_texting=NO`
**When** the user attempts to send outbound SMS
**Then** send is blocked until a required override reason is provided
**And** approved sends persist override data and audit metadata alongside the message event.

**Given** an override reason is missing or invalid
**When** the user submits outbound SMS
**Then** the action is refused with explicit refusal messaging
**And** no partial send, audit, or state-transition side effects are persisted.

### Story d.3: Outbound Audit, Outbox, and Refusal Envelope Integration

As a compliance stakeholder,
I want outbound and governance actions to emit durable audit/outbox records with consistent refusal behavior,
So that operational decisions are traceable and clients can respond deterministically.

**FRs:** FR-CS-024

**Acceptance Criteria:**

**Given** outbound or governance actions succeed or are refused
**When** mutations and response serialization complete
**Then** successful critical actions write audit/outbox records atomically
**And** refused actions use shared refusal envelopes with clear policy reasons and no partial writes.

### Story d.4: Operator Interaction Contracts for Outbound Safety

As a frontline operator,
I want outbound policy controls to be visible and accessible in desktop, tablet, and mobile thread workflows,
So that I can complete actions quickly without violating governance rules.

**FRs:** FR-CS-016, FR-CS-022, FR-CS-023
**NFRs:** NFR-CS-011
**Depends On:** Story 3.3, Story 4.1, Story 4.2
**Parallel Lane:** lane-d-outbound-ux

**Acceptance Criteria:**

**Given** users perform claim/send/close actions across supported breakpoints
**When** UI interaction patterns render
**Then** policy guardrails, refusal messages, and confirmation copy are explicit and keyboard/screen-reader accessible
**And** responsive layouts preserve thread state, escalation visibility, and action affordances without hidden policy paths.

**Given** a thread view is rendered by state
**When** action controls appear
**Then** action sets are consistent and explicit:
  - UNCLAIMED: Call, Text, Claim
  - CLAIMED: Call, Text, Close
  - CLOSED: Call, Send Message.

## Epic UX: UX Remediation and Accessibility Hardening

Deliver usability and accessibility remediation for ConnectShyft operational flows so core users can complete tasks reliably without coaching.
**FRs covered:** FR-CS-005, FR-CS-013, FR-CS-014, FR-CS-016, FR-CS-022, FR-CS-023, FR-CS-024

### Story ux-r1: Mobile-First Inbox/Mine/Thread Redesign

As a frontline volunteer,
I want Inbox, Mine, and Thread screens to use a simple mobile-first interaction model,
So that I can understand and act without cognitive overload.

**Acceptance Criteria:**

**Given** operational navigation is rendered
**When** users move between primary surfaces
**Then** the app uses persistent bottom navigation (`Inbox`, `Mine`, `More`) with no hidden fourth primary tab
**And** Inbox/Mine use large-card thread rows suitable for touch and readability
**And** thread headers prioritize neighbor and conference context.

### Story ux-r2: Accessibility and Language Hardening

As an operator (including senior users),
I want controls and language to be accessible and plain,
So that I can use the system without confusion or strain.

**Acceptance Criteria:**

**Given** core interaction surfaces (Inbox, Mine, Thread, Add Neighbor, Close)
**When** components render
**Then** body text, tap-target sizing, and keyboard/screen-reader behavior satisfy locked accessibility constraints
**And** button labels use action verbs and avoid internal RBAC/UUID jargon.

### Story ux-r3: Voicemail and Indicator Behavior

As a claimed thread owner,
I want voicemail events to be reflected clearly without losing my thread context,
So that I can follow up without inbox churn.

**Acceptance Criteria:**

**Given** voicemail is received on a CLAIMED thread
**When** lists refresh
**Then** the thread remains in Mine and shows voicemail indicators
**And** voicemail does not reclassify the thread into Inbox.

**Given** voicemail is received on an UNCLAIMED thread
**When** lists refresh
**Then** the thread remains in Inbox with voicemail-received labeling per UX contract.

### Story ux-r4: Outbound Policy Guardrail UI

As a volunteer sending messages,
I want policy constraints to be enforced with clear UX feedback,
So that I can complete actions safely and correctly.

**Acceptance Criteria:**

**Given** outbound actions are triggered
**When** preference and lifecycle policies apply
**Then** the UI enforces override requirements, reopen behavior, and refusal messaging consistently
**And** envelope outcomes map to predictable UX handling (`success`, `refusal`, `error`).

## Epic e: Inbound Webhook Reliability and Voicemail Continuity

Enable secure, idempotent Twilio ingestion for SMS/voice/transcription with replay safety and parallel-delivery quality gates.

### Story e.1: Verified Webhook Ingress and Deterministic Context Routing

As a platform operator,
I want every inbound webhook verified and mapped to the correct tenant/orgUnit via number mapping,
So that spoofed or misrouted events cannot create operational artifacts.

**FRs:** FR-CS-021

**Acceptance Criteria:**

**Given** Twilio webhook requests reach ConnectShyft endpoints
**When** signature validation and number mapping resolution run
**Then** only valid signed requests are processed
**And** each accepted webhook resolves deterministic `(tenant_id, org_unit_id)` context before downstream handling.

### Story e.2: Inbound SMS Processing with Active-Thread Ensure

As an orgUnit operator,
I want inbound SMS events to append to the correct active thread or create one when needed,
So that SMS timelines stay complete and context-consistent.

**FRs:** FR-CS-018

**Acceptance Criteria:**

**Given** a valid inbound SMS webhook for a mapped number
**When** processing executes
**Then** the system ensures a single active thread for `(tenant_id, org_unit_id, neighbor_id)` and appends the message artifact
**And** duplicate timeline entries are prevented by idempotent processing paths.

### Story e.3: Inbound Voice Webhook to Voicemail Artifact Pipeline

As a communication responder,
I want inbound voice events to create voicemail artifacts tied to the active thread,
So that voice interactions are visible in the same operational timeline.

**FRs:** FR-CS-019

**Acceptance Criteria:**

**Given** a valid inbound voice webhook
**When** processing completes
**Then** a voicemail artifact is created and linked to the correct active thread
**And** a transcription request is queued with correlation metadata for later attachment.

### Story e.4: Transcription Webhook Attachment to Voicemail Records

As an operator reviewing voice communication,
I want transcription callbacks to attach text to the correct voicemail record,
So that voice content is searchable and actionable in-thread.

**FRs:** FR-CS-020

**Acceptance Criteria:**

**Given** a valid voicemail transcription callback
**When** the callback is processed
**Then** the transcript is attached to the correct voicemail artifact and reflected in thread timeline views
**And** missing or invalid voicemail correlation is refused with no orphaned updates.

### Story e.5: Replay-Safe Webhook Receipt Ledger and Retention Controls

As a reliability engineer,
I want webhook replay protection backed by a receipt ledger with retention controls,
So that duplicate Twilio events are safely ignored and storage remains bounded.

**FRs:** FR-CS-021a

**Acceptance Criteria:**

**Given** webhook events identified by Twilio SID and event type
**When** the same event is received again
**Then** unique `(tenant_id, provider, sid, event_type)` receipt checks suppress duplicate domain writes
**And** receipt retention policy is enforced by scheduled cleanup without impacting replay safety windows.

### Story e.6: Parallel Delivery Safety Gates for ConnectShyft Rollout

As a release maintainer,
I want policy and regression gates enforced for ConnectShyft pull requests,
So that ConnectShyft can ship in parallel with RouteShyft without cross-module regressions.

**FRs:** FR-CS-021, FR-CS-021a
**NFRs:** NFR-CS-001, NFR-CS-004, NFR-CS-010
**Depends On:** Story 1.5, Story 5.1, Story 5.5
**Parallel Lane:** lane-e-release-safety

**Acceptance Criteria:**

**Given** a ConnectShyft branch or pull request pipeline
**When** CI executes
**Then** `npm run policy:check` runs as first blocking gate, import-boundary checks block route/connectshyft direct imports, and RouteShyft regression lane is required
**And** rollout controls remain feature-flag/allow-list based with documented rollback path.

\
Acceptance Criteria Additions (locked):\
• Outbound tap on CLOSED (Call or Send SMS) reopens immediately: CLOSED → UNCLAIMED + thread_reopened_by_user.\
• Reopen tap resets escalation_stage to 0 and resets inactivity tracking (last_engagement_at_utc).\
• Inbound events do not reopen CLOSED threads.\
\
\
Acceptance Criteria Additions (locked):\
• Escalation reset triggers are distinct from inactivity reset triggers.\
• Inactivity resets only on Claim, Outbound SMS send, or Call tap (including reopen tap).\
• Voicemail-only inbound does not reset escalation or inactivity.\
• Reopen tap from CLOSED resets escalation to Stage 0 and recalculates next_evaluation_at_utc from now.\
\
\
Acceptance Criteria Additions (locked):\
• Outbound call uses bridge call only (no WebRTC / SIP / softphone).\
• Call state machine implemented: INITIATED, VOLUNTEER_RINGING, VOLUNTEER_NO_ANSWER, NEIGHBOR_RINGING, CONNECTED, COMPLETED.\
• CONNECTED triggers auto-claim (implicit claim).\
• Manual retry only. No automatic redial or retry loops.\
• Sending SMS from CLOSED reopens immediately on send tap (CLOSED → UNCLAIMED + thread_reopened_by_user).\
\
\
Acceptance Criteria Additions (locked):\
• If inbound call has no active thread: forward to intake and log intake fallback audit event(s).\
• If historical thread exists: write a timeline system event on the historical thread (non-inbox-visible).\
• Intake fallback does not reopen CLOSED threads and does not reset escalation or inactivity.\
\
\
Acceptance Criteria Additions (locked):\
• Active UNCLAIMED thread inbound voice must be voicemail only (enforced deterministically).\
• Voicemail artifacts do not reset escalation or inactivity (no last_engagement_at_utc update).\
• CLOSED inbound voice routes to intake fallback (no auto-reopen).\
\
