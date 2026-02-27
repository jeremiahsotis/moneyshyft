# Story f.3: Provider Leg and Message Correlation Fallback Mapping

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want fallback correlation mapping between provider IDs and internal IDs,
so that webhook handling remains deterministic even if metadata is incomplete.

## Acceptance Criteria

1. Given outbound calls/messages are dispatched, when provider identifiers are returned, then provider leg/message identifiers are persisted with unique provider-scoped constraints.
2. Given inbound callbacks arrive without expected metadata, when correlation resolution executes, then fallback lookup by provider identifier can recover internal call/message identity or refuse deterministically.
3. Given duplicate provider identifiers are received, when persistence or lookup executes, then unique constraints and replay-safe handling prevent duplicate domain writes.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: no
- Operability Pairing Notes: Correlation fallback protects operator timelines from data loss when provider metadata is missing or malformed.
- Real-User Validation Evidence: Pending webhook replay simulation demonstrating fallback resolution and deterministic refusal paths.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Backend reliability scope only.

## Tasks / Subtasks

- [ ] Implement provider leg/message mapping persistence (AC: 1, 3)
  - [ ] Persist provider call leg IDs with provider name and internal call attempt linkage.
  - [ ] Persist provider message IDs with provider name and internal message linkage.
- [ ] Implement fallback correlation resolution path (AC: 2)
  - [ ] Attempt metadata-first correlation, then provider identifier fallback lookup.
  - [ ] Return deterministic refusal when correlation cannot be resolved safely.
- [ ] Integrate replay-safe uniqueness controls (AC: 3)
  - [ ] Enforce unique constraints for provider ID mappings.
  - [ ] Ensure duplicate callbacks do not create duplicate message/voicemail/thread events.
- [ ] Add correlation and replay test coverage (AC: 1, 2, 3)
  - [ ] Unit tests for metadata-present and metadata-missing paths.
  - [ ] Integration tests for duplicate callbacks and deterministic refusal outcomes.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-021a.
- NFR alignment: NFR-CS-007, NFR-CS-012.
- Depends on `f-1-provider-adapter-interface-and-provider-registry` and `f-2-canonical-comms-event-model-and-event-store`.

### Architecture Compliance

- Keep idempotency and dedupe behavior aligned with `connectshyft.cs_webhook_receipts`.
- Store provider mapping data in provider-neutral schema naming contracts.
- Preserve deterministic no-partial-write behavior on unresolved correlation.

### File Structure Requirements

- Correlation mapping logic in ConnectShyft comms core modules under `src/src/modules/connectshyft/`.
- Schema/migration updates under `src/db/migrations/connectshyft/` if mapping tables evolve.
- Tests in `src/src/modules/connectshyft/__tests__/` and API webhook suites.

### Testing Requirements

- Validate provider ID mapping insert/read behavior for call and message flows.
- Validate fallback correlation path when metadata is absent.
- Validate duplicate provider callback suppression across repeated events.

### Project Structure Notes

- Reuse receipt-ledger semantics and avoid creating parallel dedupe systems.
- Keep mapping tables provider-scoped to support future adapters.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story f-3-provider-leg-message-correlation-fallback-mapping`.

### References

- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic f, Story f.3)
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-02-27.md`
- `/Users/jeremiahotis/projects/connectshyft/db_schema.sql`
- `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generation only (no implementation commands executed).

### Completion Notes List

- Created implementation-ready Story f.3 context for provider ID fallback correlation and replay-safe mapping behavior.

### File List

- _bmad-output/implementation-artifacts/f-3-provider-leg-message-correlation-fallback-mapping.md

## Change Log

- 2026-02-27: Created Story f.3 ready-for-dev context document.
