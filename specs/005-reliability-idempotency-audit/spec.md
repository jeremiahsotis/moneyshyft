# Feature Specification: CS-005 Reliability / Idempotency / Audit

**Feature Branch**: `005-reliability-idempotency-audit`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-005_Reliability_Idempotency_Audit_Guardrailed_Spec.md`  
**Source Input**: `/Users/jeremiahotis/projects/connectshyft/specs/connectshyft-recovery/issues/CS-005_Reliability_Idempotency_Audit_Guardrailed_Spec.md`

## Overview

CS-005 adds the minimum durable reliability layer required for ConnectShyft outbound SMS, outbound call initiation, persisted bridge-session creation, and provider webhook handling. The feature must prevent duplicate side effects before they occur, keep webhook processing replay-safe, record append-only audit history, and persist bounded retry intent without redesigning bridge orchestration, provider adapters, UI, or broader schema ownership.

This feature is governed by the execution packet, the Communication Infrastructure ADR, the canonical data model note, the CS-005 reliability sequence diagram, and the minimal internal event model note. Where the issue spec is terse, those governing documents define the non-negotiable behavior and boundaries.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prevent Duplicate Outbound Side Effects (Priority: P1)

As a ConnectShyft operator, I can retry an outbound message or call request with the same `Idempotency-Key` without creating duplicate provider side effects.

**Why this priority**: Idempotency before side effects is the main safety requirement for CS-005 and blocks safe production use of outbound communication.

**Independent Test**: Submit the same outbound message or outbound call request twice with the same effective payload and verify only one provider action occurs while the second response returns the authoritative existing result. Submit the same key with a different payload and verify the request is rejected with no new side effect.

**Acceptance Scenarios**:

1. **Given** an outbound SMS or call request with a new `Idempotency-Key`, **When** the request begins, **Then** a durable idempotency record is created before any provider side effect is attempted.
2. **Given** a second outbound request with the same `Idempotency-Key` and materially identical payload, **When** it is received, **Then** the system returns the original or current authoritative result and does not create a second provider side effect.
3. **Given** a second outbound request with the same `Idempotency-Key` and a materially different payload, **When** it is received, **Then** the system rejects the request loudly and does not create any new provider side effect.

---

### User Story 2 - Keep Webhook Processing Replay-Safe (Priority: P1)

As a system maintainer, I can replay or receive duplicate provider webhooks without causing duplicate bridge transitions, duplicate messages, or duplicate audit side effects.

**Why this priority**: Duplicate or replayed provider events are the main operational failure mode after outbound initiation succeeds.

**Independent Test**: Deliver the same verified provider event multiple times and confirm the receipt is checkpointed, the first event is applied once, and later duplicates are marked ignored without duplicating domain state changes.

**Acceptance Scenarios**:

1. **Given** a verified provider webhook that has not yet been applied, **When** it is received, **Then** the receipt is persisted before domain side effects and the event is translated once into provider-neutral internal event language.
2. **Given** a verified provider webhook that matches a previously processed receipt, **When** it is received again, **Then** the system suppresses duplicate side effects, records the duplicate outcome, and returns a replay-safe response.
3. **Given** a retryable webhook-processing failure, **When** bounded retry policy allows another attempt, **Then** retry intent is persisted without bypassing bridge or message domain state rules.

---

### User Story 3 - Produce Append-Only Reliability Audit Evidence (Priority: P2)

As a maintainer or auditor, I can inspect a durable append-only communication audit trail showing outbound mutations, duplicate suppression, retry decisions, and provider event outcomes.

**Why this priority**: The ADR and execution packet require auditable evidence for communication mutations and reliability behavior.

**Independent Test**: Trigger a successful outbound mutation, a duplicate replay, a retryable failure, and a terminal failure, then verify append-only audit rows exist for each outcome with correlation, actor, operation, target, and result state.

**Acceptance Scenarios**:

1. **Given** an outbound communication mutation, **When** it succeeds or fails, **Then** an append-only audit row records actor, operation, target entity, result state, timestamp, idempotency key, and provider references if present.
2. **Given** a duplicate or replay-safe suppression outcome, **When** the system returns the existing authoritative result or ignores a duplicate webhook, **Then** audit history records the duplicate outcome without mutating prior audit rows.
3. **Given** a bounded retry decision, **When** a retry is scheduled or exhausted, **Then** audit history records the retrying or exhausted result state with normalized failure evidence.

### Edge Cases

- A client retries while the original outbound request is still `in_progress`.
- The same `Idempotency-Key` is reused across materially different request fingerprints.
- A provider webhook arrives after the authoritative bridge or message state is already terminal.
- A provider webhook is replayed after its receipt is already marked `processed` or `ignored_duplicate`.
- A retryable provider failure is followed by a terminal failure before the next retry window.
- Background retry state must not create a new bridge session or call leg outside existing bridge-domain entry points.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All outbound ConnectShyft communication mutation endpoints that create or advance SMS, outbound calls, or bridge sessions MUST accept `Idempotency-Key`.
- **FR-002**: The system MUST persist a durable idempotency record before performing any outbound provider side effect.
- **FR-003**: A repeated request with the same idempotency scope and materially identical request fingerprint MUST return the original or current authoritative result and MUST NOT create duplicate provider side effects.
- **FR-004**: A repeated request with the same idempotency scope and materially different request fingerprint MUST fail loudly and MUST NOT create provider side effects.
- **FR-005**: Provider webhooks MUST be signature-verified before receipt application. Unverified webhook requests MUST be rejected before receipt persistence, event translation, and downstream domain side effects.
- **FR-006**: Duplicate or replayed provider events MUST NOT create duplicate bridge transitions, duplicate message records, duplicate audit rows, or duplicate provider side effects.
- **FR-007**: Retry handling MUST be bounded, persist retry intent and exhaustion state, and MUST NOT bypass bridge or message domain state rules.
- **FR-008**: Communication audit history MUST be append-only and MUST record actor, operation, target entity, channel, result state, timestamp, idempotency key, and provider references when present.
- **FR-009**: Provider-specific request, webhook, and error semantics MUST remain confined to infrastructure. ConnectShyft route and module reliability code MUST NOT import provider adapters directly or read raw provider payload fields.
- **FR-010**: Bridge-session lifecycle ownership MUST remain in the existing bridge domain/application flow; CS-005 MUST harden reliability around that flow without redesigning it.
- **FR-011**: System MUST preserve lane boundaries and deployment compatibility by keeping `/api/v1/auth/*` and `/api/v1/platform/admin/*` delegated to `admin-api`, keeping all other lane `/api` routes lane-owned, and keeping shared-Postgres migration ownership with `admin-api`.

### Idempotency Fingerprint Rules

Materially relevant request fingerprint fields for CS-005 are:

- `send_sms`
  - `threadId`
  - normalized destination contact point or destination phone
  - normalized message body
  - channel = `sms`
  - actor scope
- `start_outbound_call`
  - `threadId`
  - target participant or contact point
  - selected outbound number
  - actor scope
  - channel = `voice`
- `start_bridge_session`
  - `threadId`
  - operator participant
  - target participant or contact point
  - selected outbound number
  - actor scope
  - channel = `bridge`
- `apply_provider_event`
  - `providerName`
  - normalized internal event type
  - provider event identity (`providerEventId` if available, otherwise verified `payloadHash`)
  - correlated internal bridge or message resource when already resolved

Fields such as trace IDs, request timestamps, header ordering, and raw provider payload formatting are not materially relevant fingerprint inputs.

### Non-Functional Requirements

- **NFR-001**: Reliability hardening MUST be minimal and surgical; it MUST NOT introduce bridge redesign, provider adapter redesign, UI changes, or unrelated architecture changes.
- **NFR-002**: Idempotency and webhook replay protection MUST remain durable across process restarts by relying on persisted records rather than in-memory replay state.
- **NFR-003**: Retry policy MUST remain bounded and classification-driven; the initial implementation MUST avoid a broad retry subsystem or background orchestration redesign.
- **NFR-004**: Audit persistence MUST be append-only and distinct from volunteer-facing thread timeline rendering.
- **NFR-005**: Production deployment topology, localhost-only API bindings, host-managed Nginx routing, and shared Postgres ownership MUST remain unchanged.

### Initial Retry Execution Model

CS-005 persists retry intent only.

- No background worker or scheduler is introduced in CS-005.
- No immediate automatic redial or provider re-dispatch loop is introduced in CS-005.
- Retryable failures may update durable retry metadata (`attemptCount`, `nextRetryAt`, `lastFailureClassification`) and append audit evidence only.
- A later issue may consume persisted retry intent, but CS-005 itself stops at durable recording plus replay-safe suppression.

## Compatibility Acceptance Scenarios

1. **Given** CS-005 adds reliability persistence and route/application wiring, **When** routing ownership is reviewed, **Then** `/api/v1/auth/*` and `/api/v1/platform/admin/*` remain delegated to `admin-api` and `/api/v1/connectshyft/*` remains lane-owned.
2. **Given** CS-005 introduces reliability state persistence only inside the existing ConnectShyft and shared communication boundaries, **When** deployment topology is reviewed, **Then** host Nginx routing, localhost-only API bindings, Docker-hosted APIs, and static frontend serving remain unchanged.
3. **Given** CS-005 adds minimal durable reliability tables or columns, **When** database ownership is reviewed, **Then** shared Postgres compatibility remains intact and `admin-api` remains the sole production migration owner.

### Key Entities *(include if feature involves data)*

- **Communication Idempotency Record**: Durable request-safety record keyed by tenant, operation scope, actor scope, idempotency key, and request fingerprint.
- **Communication Audit Log**: Append-only reliability and mutation history recording actor, operation, target, channel, result, correlation, provider references, and timestamps.
- **Communication Webhook Receipt**: Verified provider ingress checkpoint used for duplicate suppression, processing status, and bounded retry bookkeeping.
- **Bridge Session**: Existing authoritative bridge lifecycle record that continues to own bridge state while gaining reliability metadata integration.
- **Communication Message**: Existing authoritative outbound/inbound message record that remains the user-facing timeline entity while idempotency and audit hardening are added around it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Repeating the same outbound message or call request with the same `Idempotency-Key` and effective payload results in exactly one provider side effect and one authoritative application result.
- **SC-002**: Reusing the same `Idempotency-Key` with a materially different payload is rejected without creating a new side effect.
- **SC-003**: Replaying a verified provider webhook does not create duplicate bridge transitions, duplicate message records, or duplicate audit rows.
- **SC-004**: Append-only audit rows exist for successful outbound operations, duplicate suppressions, retry scheduling or exhaustion, and terminal failures.
- **SC-005**: Targeted ConnectShyft reliability tests, `apps/connectshyft-api` build, and `node scripts/enforce-workspace-boundaries.js` all pass after implementation.
- **SC-006**: Routing delegation, canonical API ports, shared Postgres compatibility, and deployment runbook reproducibility remain unchanged and are explicitly re-verified.
