# Story e.5: Replay-Safe Webhook Receipt Ledger and Retention Controls

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reliability engineer,
I want webhook replay protection backed by a receipt ledger with retention controls,
so that duplicate provider events are safely ignored and storage remains bounded.

## Acceptance Criteria

1. Given webhook events identified by provider event identifiers and event type, when the same event is received again, then unique `(tenant_id, provider, sid, event_type)` receipt checks suppress duplicate domain writes.
2. Given receipt insert succeeds for a first-seen event, when downstream processing runs, then webhook handling proceeds normally and emits expected domain artifacts.
3. Given receipt retention policy is enforced, when scheduled cleanup runs, then ledger records are retained for policy window and expired rows are removed without impacting replay-safety guarantees inside the active window.
4. Given high-volume duplicate deliveries occur, when handlers run under load, then dedupe behavior remains deterministic and ingestion latency remains within locked webhook budget expectations.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Dedupe reliability prevents duplicate operator-visible timeline noise and protects trust in webhook-driven state.
- Real-User Validation Evidence: `npm run test:e2e -- tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts` (4/4 passing on 2026-03-03) validating first-seen processing, duplicate suppression, retention cleanup, and duplicate-burst latency budget.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Reliability and data-retention scope only; no role administration changes.

## Tasks / Subtasks

- [x] Implement receipt-ledger dedupe write path (AC: 1, 2)
  - [x] Enforce unique constraint `(tenant_id, provider, sid, event_type)` in persistence layer.
  - [x] Gate downstream domain writes on successful first-seen receipt insertion.
- [x] Implement deterministic duplicate suppression behavior (AC: 1)
  - [x] Treat unique-constraint conflicts as duplicate webhook receives.
  - [x] Return stable acknowledgement/refusal semantics without duplicate domain mutations.
- [x] Implement retention cleanup controls (AC: 3)
  - [x] Add scheduled cleanup for expired receipt records (180-day policy baseline).
  - [x] Preserve replay-safety window guarantees and cleanup observability metrics.
- [x] Add performance and regression coverage (AC: 4)
  - [x] Duplicate-load tests proving deterministic suppression behavior.
  - [x] Latency budget checks for webhook ingestion path under duplicate bursts.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-021a.
- Related constraints: FR-CS-021, NFR-CS-010.
- Story dependencies:
  - `e-1-verified-webhook-ingress-and-deterministic-context-routing`
  - `f-1-provider-adapter-interface-and-provider-registry`
  - `f-2-canonical-comms-event-model-and-event-store`
  - `f-3-provider-leg-message-correlation-fallback-mapping`

### Architecture Compliance

- Align with AD-08 idempotency storage and retention decisions.
- Keep dedupe key shape and retention controls consistent with schema and migration contracts.
- Preserve deterministic pipeline ordering: verify -> dedupe -> route -> domain writes.

### Library / Framework Requirements

- Reuse ConnectShyft mutation wrapper and outbox-safe write patterns.
- Reuse canonical event identity extraction from provider abstraction modules.
- Avoid per-handler bespoke dedupe storage; centralize receipt ledger behavior.

### File Structure Requirements

- Receipt ledger table/repository in ConnectShyft schema modules and migrations.
- Webhook pipeline dedupe integration in `src/src/routes/api/v1/connectshyft.ts` and `src/src/modules/connectshyft/`.
- Cleanup scheduler/job logic in backend job runner paths.
- Tests in `tests/api/platform/` plus module-level unit/integration suites.

### Testing Requirements

- Validate first-seen event inserts receipt and allows domain writes.
- Validate duplicate receives suppress domain writes deterministically.
- Validate retention cleanup removes expired receipts only.
- Validate webhook ingestion latency remains within architecture budget goals.

### Previous Story Intelligence

- `e.1` supplies signature/context prerequisites before dedupe.
- `f.2` and `f.3` supply canonical event identities and fallback mapping needed for stable dedupe keys.

### Git Intelligence Summary

- Recent provider-abstraction stories emphasized deterministic ordering and auditability; dedupe should follow same transactional rigor.

### Latest Technical Information

- Use locked architecture + provider abstraction artifacts as the source of truth for dedupe key shape and retention policy.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep duplicate suppression logic centralized so SMS/voice/transcription handlers behave uniformly.
- Avoid retention cleanup implementations that remove still-in-window dedupe keys.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.5)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-021a)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-08, dedupe strategy, retention)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1.6)
- `event_schema.md`
- `provider_adapter.md`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n -i "epic\\s*e|e-5-" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `rg -n "FR-CS-021a" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `rg -n "AD-08|webhook_receipts|retention|dedupe" _bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`
- `npm run branch:ensure-workflow -- --workflow dev-story --story e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`
- `npm run branch:ensure-workflow -- --lane connectshyft --workflow dev-story --story e-5-replay-safe-webhook-receipt-ledger-and-retention-controls`
- `npm test --prefix src`
- `npm test --prefix src -- src/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts src/src/migrations/__tests__/connectShyftWebhookReceiptReplayIdentityMigration.test.ts`
- `npm run build --prefix src`
- `npm run test:e2e -- tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts`
- `npm run story:status:set -- --story-key e-5-replay-safe-webhook-receipt-ledger-and-retention-controls --status review --lane connectshyft`

### Implementation Plan

- Align receipt ledger persistence with AD-08 replay identity `(tenant_id, provider, sid, event_type)` while preserving existing response `dedupeKey` contracts.
- Add retention metrics + cleanup service functions in provider-correlation module and expose admin API endpoints for operations/scheduler use.
- Expand regression coverage with deterministic duplicate-burst unit tests and activate e.5 API ATDD suite for end-to-end webhook/retention validation.

### Completion Notes List

- Implemented replay-identity persistence upgrades in `providerCorrelationMappings.ts` and added migration `20260303170000_add_connectshyft_webhook_receipt_replay_identity.ts` enforcing unique `(tenant_id, provider_name, sid, event_type)`.
- Added retention observability and cleanup controls (`loadConnectShyftWebhookReceiptMetrics`, `cleanupConnectShyftWebhookReceipts`) with admin routes:
  - `GET /api/v1/connectshyft/admin/webhook-receipts/metrics`
  - `POST /api/v1/connectshyft/admin/webhook-receipts/cleanup`
- Updated inbound webhook success payloads to include `timelineOutcome` alongside `timeline` for stable ATDD contract assertions.
- Added/updated regression tests:
  - Provider-correlation unit coverage for event-type scoped replay identity, concurrent duplicate bursts, and retention cleanup metrics.
  - Migration test coverage for replay-identity schema changes.
  - Activated and passed e.5 API ATDD scenarios (4/4).
- Validated final review gates on 2026-03-04: backend Jest regression (`66 passed, 2 skipped`), backend TypeScript build, and e.5 API ATDD (`4/4`) all passing before story/sprint status transition to `review`.

### File List

- _bmad-output/implementation-artifacts/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- src/src/modules/connectshyft/providerCorrelationMappings.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/migrations/20260303170000_add_connectshyft_webhook_receipt_replay_identity.ts
- src/src/migrations/__tests__/connectShyftWebhookReceiptReplayIdentityMigration.test.ts
- src/src/modules/connectshyft/__tests__/providerCorrelationMappings.test.ts
- tests/api/platform/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.atdd.api.spec.ts

## Change Log

- 2026-03-03: Created Story e.5 ready-for-dev context document.
- 2026-03-03: Implemented replay-safe receipt identity `(tenant_id, provider_name, sid, event_type)`, retention metrics/cleanup controls, and e.5 API + unit regression coverage.
- 2026-03-04: Re-validated full backend regression/build plus e.5 ATDD and transitioned story + connectshyft sprint status from `in-progress` to `review`.
