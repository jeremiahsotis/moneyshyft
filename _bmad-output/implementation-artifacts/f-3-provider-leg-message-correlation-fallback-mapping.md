# Story f.3: Provider Leg and Message Correlation Fallback Mapping

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a backend engineer,
I want fallback correlation mapping between provider IDs and internal IDs,
so that webhook handling remains deterministic even if metadata is incomplete.

## Acceptance Criteria

1. Given outbound calls/messages are dispatched, when provider identifiers are returned, then provider leg/message identifiers are persisted with unique provider-scoped constraints.
2. Given inbound callbacks arrive without expected metadata, when correlation resolution executes, then fallback lookup by provider identifier can recover internal call/message identity or refuse deterministically.
3. Given duplicate provider identifiers are received, when persistence or lookup executes, then unique constraints and replay-safe handling prevent duplicate domain writes.
4. Given fallback correlation resolves or refuses a callback, when ConnectShyft contracts are queried, then operator-visible thread/timeline outcomes are deterministic, duplicate-safe, and free of phantom lifecycle updates.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Correlation fallback protects operator timelines from data loss when provider metadata is missing or malformed.
- Real-User Validation Evidence: Pending webhook replay simulation demonstrating fallback resolution and deterministic refusal paths.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Backend reliability scope only.

## Tasks / Subtasks

- [x] Implement provider leg/message mapping persistence (AC: 1, 3)
  - [x] Persist provider call leg IDs with provider name and internal call attempt linkage.
  - [x] Persist provider message IDs with provider name and internal message linkage.
- [x] Implement fallback correlation resolution path (AC: 2)
  - [x] Attempt metadata-first correlation, then provider identifier fallback lookup.
  - [x] Return deterministic refusal when correlation cannot be resolved safely.
- [x] Preserve operator-visible deterministic outcomes on fallback paths (AC: 4)
  - [x] Ensure unresolved correlation emits auditable deterministic refusal outcomes surfaced through existing ConnectShyft contracts.
  - [x] Ensure resolved fallback emits exactly one canonical domain mutation per provider event.
- [x] Integrate replay-safe uniqueness controls (AC: 3)
  - [x] Enforce unique constraints for provider ID mappings.
  - [x] Ensure duplicate callbacks do not create duplicate message/voicemail/thread events.
- [x] Add correlation and replay test coverage (AC: 1, 2, 3, 4)
  - [x] Unit tests for metadata-present and metadata-missing paths.
  - [x] Integration tests for duplicate callbacks and deterministic refusal outcomes.
  - [x] Contract tests for deterministic operator-visible timeline/state outcomes after fallback resolution/refusal.

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
- Schema/migration updates under `src/src/migrations/` if mapping tables evolve.
- Tests in `src/src/modules/connectshyft/__tests__/` and API webhook suites.

### Testing Requirements

- Validate provider ID mapping insert/read behavior for call and message flows.
- Validate fallback correlation path when metadata is absent.
- Validate duplicate provider callback suppression across repeated events.
- Validate deterministic operator-visible timeline/state outcomes for fallback resolve and refusal paths.

### Project Structure Notes

- Reuse receipt-ledger semantics and avoid creating parallel dedupe systems.
- Keep mapping tables provider-scoped to support future adapters.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story f-3-provider-leg-message-correlation-fallback-mapping`.

### References

- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic f, Story f.3)
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`
- `/Users/jeremiahotis/projects/connectshyft/db_schema.sql`
- `/Users/jeremiahotis/projects/connectshyft/provider_adapter.md`
- `/Users/jeremiahotis/projects/connectshyft/_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story f-3-provider-leg-message-correlation-fallback-mapping` (fail: lane mismatch on `codex/dev`)
- `npm run branch:ensure-workflow -- --lane connectshyft --workflow dev-story --story f-3-provider-leg-message-correlation-fallback-mapping` (pass after branch change)
- `cd src && npm test -- src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts src/modules/connectshyft/__tests__/providerRegistry.test.ts src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts src/migrations/__tests__/connectShyftProviderCorrelationMappingsMigration.test.ts` (pass)
- `cd src && npm run build` (pass)
- `cd src && npm test` (pass: 61 passed, 2 skipped)

### Completion Notes List

- Added `src/src/modules/connectshyft/providerCorrelationMappings.ts` with provider leg/message correlation mapping persistence, metadata-fallback lookup resolution, and replay-safe webhook receipt dedupe primitives.
- Extended provider dispatch contracts in `src/src/modules/connectshyft/providerRegistry.ts` to return deterministic `providerLegId`/`providerMessageId` values used by fallback mapping.
- Updated `src/src/routes/api/v1/connectshyft.ts` to:
  - persist provider identifier mappings after outbound dispatch canonical events,
  - apply metadata-first correlation with provider-identifier fallback on inbound webhooks,
  - emit deterministic business refusals for unresolved/ambiguous/conflicting correlation,
  - suppress duplicate callbacks before lifecycle/canonical mutation writes via receipt dedupe.
- Added migration `20260228103000_create_connectshyft_provider_correlation_mappings.ts` for provider-scoped uniqueness and webhook dedupe constraints (`cs_provider_identifier_mappings`, `cs_webhook_receipts`).
- Added test coverage for mapping persistence, fallback correlation, duplicate suppression, and deterministic refusal/timeline contracts.

### File List

- _bmad-output/implementation-artifacts/f-3-provider-leg-message-correlation-fallback-mapping.md
- src/src/modules/connectshyft/providerCorrelationMappings.ts
- src/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
- src/src/modules/connectshyft/providerRegistry.ts
- src/src/modules/connectshyft/__tests__/providerRegistry.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/routes/api/v1/__tests__/connectshyft.provider-registry.test.ts
- src/src/migrations/20260228103000_create_connectshyft_provider_correlation_mappings.ts
- src/src/migrations/__tests__/connectShyftProviderCorrelationMappingsMigration.test.ts

## Change Log

- 2026-02-27: Created Story f.3 ready-for-dev context document.
- 2026-02-28: Implemented provider correlation fallback mapping persistence, deterministic unresolved-correlation refusal contracts, replay-safe callback dedupe, and corresponding module/route/migration test coverage.
