# Story f.2: Canonical Comms Event Model and Event Store

Status: in-progress

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
- Real-User Validation Evidence: 2026-02-28 executed webhook replay and outbound dispatch validation via `src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` plus full `cd src && npm test` regression; verified canonical `/events` retrieval and thread timeline output are provider-neutral and deterministic.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No new role-administration surface introduced.

## Tasks / Subtasks

- [x] Define canonical event schema and persistence contract (AC: 1, 2)
  - [x] Align event model with `event_schema.md` and platform audit/outbox expectations.
  - [x] Ensure event payload supports provider metadata without leaking provider coupling into consumers.
- [x] Implement event store writes and retrieval API path (AC: 1, 3)
  - [x] Persist canonical events atomically with relevant lifecycle mutations where required.
  - [x] Add deterministic filtering for aggregate and event type retrieval.
- [x] Integrate canonical translation into inbound/outbound flows (AC: 1, 2)
  - [x] Route all provider webhook payloads through canonical translation before domain handlers.
  - [x] Ensure outbound initiation emits canonical start/queued events.
- [x] Preserve operator-consumable provider-neutral outputs (AC: 4)
  - [x] Ensure read/status contracts expose canonical event-derived fields without provider-specific naming leakage.
  - [x] Ensure timeline ordering remains deterministic under mixed inbound/outbound provider event sequences.
- [x] Add test coverage for canonicalization invariants (AC: 1, 2, 3, 4)
  - [x] Unit tests for provider payload to canonical event mapping.
  - [x] API tests for deterministic event retrieval and filtering.
  - [x] Contract tests for provider-neutral state/timeline outputs consumed by ConnectShyft clients.

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

- `npm run branch:ensure-workflow -- --workflow dev-story --story f-2-canonical-comms-event-model-and-event-store` (pass)
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/providerRegistry.test.ts src/src/modules/connectshyft/__tests__/canonicalEvents.test.ts src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts` (pass)
- `cd src && npm test` (pass)

### Completion Notes List

- Added `src/src/modules/connectshyft/canonicalEvents.ts` with canonical event record contract, provider-specific payload sanitization, deterministic ordering, aggregate/event-type filtering, and UUID-aware persistence fallback.
- Updated provider adapter canonical translation in `src/src/modules/connectshyft/providerRegistry.ts` to emit provider-neutral canonical event types and sanitized payload metadata.
- Updated `src/src/routes/api/v1/connectshyft.ts` to:
  - persist canonical events for outbound call/message dispatch and inbound webhook handling,
  - expose `GET /api/v1/connectshyft/events` with deterministic provider-neutral filtering,
  - include canonical event-derived timeline on thread detail responses,
  - support F2 synthetic thread fixtures for deterministic contract execution.
- Added/updated tests covering canonical mapping invariants, deterministic event retrieval, and provider-neutral thread timeline contracts.

### File List

- _bmad-output/implementation-artifacts/f-2-canonical-comms-event-model-and-event-store.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/canonicalEvents.ts
- src/src/modules/connectshyft/__tests__/canonicalEvents.test.ts
- src/src/modules/connectshyft/providerRegistry.ts
- src/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts
- tests/api/platform/f-2-canonical-comms-event-model-and-event-store.atdd.api.spec.ts
- tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.atdd.spec.ts
- tests/support/factories/connectShyftStoryF2Factory.ts
- tests/support/fixtures/connectShyftStoryF2.fixture.ts
- tests/api/platform/f-2-canonical-comms-event-model-and-event-store.automate.api.spec.ts
- tests/e2e/platform/f-2-canonical-comms-event-model-and-event-store.automate.spec.ts

## Change Log

- 2026-02-27: Created Story f.2 ready-for-dev context document.
- 2026-02-28: Implemented canonical comms event store, deterministic `/events` retrieval, provider-neutral canonical translation/timeline output, and associated unit/API contract tests.
