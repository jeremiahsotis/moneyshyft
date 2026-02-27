# Story f.2: Canonical Comms Event Model and Event Store

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reliability engineer,
I want provider events normalized into canonical call/message events,
so that downstream ConnectShyft behavior remains stable regardless of provider.

## Acceptance Criteria

1. Given outbound actions or provider webhook events occur, when Comms Core persists events, then canonical event records include aggregate id/type, event type, payload, and UTC timestamp with consistent schema.
2. Given downstream thread and lifecycle handlers consume events, when provider-specific payload differences exist, then canonical event translation shields domain handlers from provider-specific fields.
3. Given canonical events are queried for debugging and status endpoints, when filtered by aggregate id or event type, then responses are deterministic and provider-neutral.
4. Given operators consume ConnectShyft thread/status contracts, when canonical events drive those responses, then event-derived state and timeline outputs remain provider-neutral, stable, and deterministically ordered.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Canonical events are the operational truth source for call/message state and must remain stable across providers.
- Real-User Validation Evidence: Pending event-stream validation run using API and webhook replay fixtures.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No new role-administration surface introduced.

## Tasks / Subtasks

- [ ] Define canonical event schema and persistence contract (AC: 1, 2)
  - [ ] Align event model with `event_schema.md` and platform audit/outbox expectations.
  - [ ] Ensure event payload supports provider metadata without leaking provider coupling into consumers.
- [ ] Implement event store writes and retrieval API path (AC: 1, 3)
  - [ ] Persist canonical events atomically with relevant lifecycle mutations where required.
  - [ ] Add deterministic filtering for aggregate and event type retrieval.
- [ ] Integrate canonical translation into inbound/outbound flows (AC: 1, 2)
  - [ ] Route all provider webhook payloads through canonical translation before domain handlers.
  - [ ] Ensure outbound initiation emits canonical start/queued events.
- [ ] Preserve operator-consumable provider-neutral outputs (AC: 4)
  - [ ] Ensure read/status contracts expose canonical event-derived fields without provider-specific naming leakage.
  - [ ] Ensure timeline ordering remains deterministic under mixed inbound/outbound provider event sequences.
- [ ] Add test coverage for canonicalization invariants (AC: 1, 2, 3, 4)
  - [ ] Unit tests for provider payload to canonical event mapping.
  - [ ] API tests for deterministic event retrieval and filtering.
  - [ ] Contract tests for provider-neutral state/timeline outputs consumed by ConnectShyft clients.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-018, FR-CS-019, FR-CS-020, FR-CS-024.
- NFR alignment: NFR-CS-007, NFR-CS-012, NFR-CS-013.
- Depends on `f-1-provider-adapter-interface-and-provider-registry`.

### Architecture Compliance

- Keep canonical event model provider-neutral and stable for downstream ConnectShyft lifecycle logic.
- Preserve UTC timestamp discipline and deterministic processing order.
- Maintain replay-safe processing compatibility with receipt ledger strategy.

### File Structure Requirements

- Event model/storage modules in `src/src/modules/connectshyft/` comms core scope.
- API integration via ConnectShyft route layer and status/events endpoints.
- Tests in `src/src/modules/connectshyft/__tests__/` and `tests/api/platform/`.

### Testing Requirements

- Validate canonical event shape for outbound call/message initiation.
- Validate webhook payload normalization for call/message/transcription event families.
- Validate deterministic query behavior for event retrieval paths.
- Validate provider-neutral, deterministically ordered timeline/status outputs for operator clients.

### Project Structure Notes

- Reuse shared response envelope helpers and mutation transaction wrappers.
- Avoid direct provider payload dependencies in thread/escalation domain handlers.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story f-2-canonical-comms-event-model-and-event-store`.

### References

- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic f, Story f.2)
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`
- `/Users/jeremiahotis/projects/connectshyft/event_schema.md`
- `/Users/jeremiahotis/projects/connectshyft/openapi.yaml`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story f.2 context defining canonical event model and store expectations.

### File List

- _bmad-output/implementation-artifacts/f-2-canonical-comms-event-model-and-event-store.md

## Change Log

- 2026-02-27: Created Story f.2 ready-for-dev context document.
