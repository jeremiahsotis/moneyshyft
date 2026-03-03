# Story e.2: Inbound SMS Processing with Active-Thread Ensure

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an orgUnit operator,
I want inbound SMS events to append to the correct active thread or create one when needed,
so that SMS timelines stay complete and context-consistent.

## Acceptance Criteria

1. Given a valid inbound SMS webhook for a mapped provider number, when processing executes, then the system ensures a single active thread for `(tenant_id, org_unit_id, neighbor_id)` and appends the inbound message artifact.
2. Given an active thread already exists for `(tenant_id, org_unit_id, neighbor_id)`, when inbound SMS is processed, then no duplicate active thread is created and message ordering stays deterministic.
3. Given duplicate inbound SMS webhook deliveries for the same provider event identity, when handlers run, then duplicate timeline entries are suppressed by replay-safe processing.
4. Given no active thread exists and context is valid, when ensure logic runs, then a new active thread is created under canonical thread constraints and message artifact persistence remains atomic with audit/outbox writes.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Inbound SMS continuity is operator-critical; missing or duplicate entries directly degrade inbox trust and response speed.
- Real-User Validation Evidence: Pending implementation. Validate inbound SMS append/create and duplicate suppression using provider fixture events.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story is webhook + thread data handling; no role-admin capability changes.

## Tasks / Subtasks

- [ ] Implement inbound SMS canonical event-to-domain mapping (AC: 1)
  - [ ] Translate provider webhook payload to canonical inbound message event.
  - [ ] Resolve neighbor + context before thread ensure.
- [ ] Implement active-thread ensure integration for inbound SMS (AC: 1, 2, 4)
  - [ ] Reuse conflict-safe ensure behavior from thread ensure contracts.
  - [ ] Preserve single-active-thread constraints across concurrent deliveries.
- [ ] Implement replay-safe suppression for duplicate inbound SMS events (AC: 3)
  - [ ] Enforce receipt-ledger-backed idempotency prior to artifact writes.
  - [ ] Ensure duplicate receives are acknowledged without duplicate timeline rows.
- [ ] Add API/module regression coverage (AC: 1, 2, 3, 4)
  - [ ] Concurrency tests around ensure + append behavior.
  - [ ] Duplicate delivery tests proving no duplicate message artifacts.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-018.
- Related constraints: FR-CS-011, FR-CS-012, FR-CS-013, FR-CS-021, FR-CS-021a.
- Story dependencies:
  - `e-1-verified-webhook-ingress-and-deterministic-context-routing`
  - `c-2-thread-ensure-endpoint-with-conflict-safe-idempotency`
  - `f-1-provider-adapter-interface-and-provider-registry`
  - `f-2-canonical-comms-event-model-and-event-store`

### Architecture Compliance

- Respect canonical active-thread uniqueness and ensure idempotency semantics.
- Keep webhook replay suppression and message persistence deterministic.
- Preserve shared envelope and audit/outbox mutation wrapper patterns.

### Library / Framework Requirements

- Reuse ConnectShyft thread ensure and read/lifecycle modules.
- Reuse provider adapter canonical event translation utilities.
- Avoid direct provider-specific parsing in domain services.

### File Structure Requirements

- Webhook handler integration: `src/src/routes/api/v1/connectshyft.ts`.
- Ensure/message domain modules: `src/src/modules/connectshyft/`.
- Message artifact persistence repositories: ConnectShyft data modules under `src/src/modules/connectshyft/`.
- Tests: `tests/api/platform/` and `src/src/modules/connectshyft/__tests__/`.

### Testing Requirements

- Validate append-to-existing-thread behavior for active thread scenarios.
- Validate create-and-append behavior when no active thread exists.
- Validate concurrent inbound deliveries preserve one active thread.
- Validate duplicate provider deliveries do not duplicate timeline artifacts.

### Previous Story Intelligence

- `c.2` established conflict-safe ensure semantics that should be reused directly.
- `e.1` defines ingress verification and deterministic context required before this story’s processing.

### Git Intelligence Summary

- Recent implementation history favors deterministic side-effect ordering and explicit refusal handling; keep inbound SMS flow aligned.

### Latest Technical Information

- Use provider abstraction migration artifacts as authoritative behavior source for inbound SMS contracts.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Ensure thread creation/update and artifact writes remain transaction-safe.
- Keep dedupe checks ahead of message artifact write paths.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story e-2-inbound-sms-processing-with-active-thread-ensure`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic e, Story e.2)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-018, FR-CS-021a)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (webhook pipeline, ensure/idempotency rules)
- `_bmad-output/planning-artifacts/sprint-change-proposal-ConnectShyft-2026-02-27.md` (Section 4.1.5)
- `provider_adapter.md`
- `openapi.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `rg -n -i "epic\\s*e|e-2-" _bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md`
- `rg -n "FR-CS-018|FR-CS-021a" _bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md`
- `rg -n "ensure|active thread|webhook|dedupe" _bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md`

### Completion Notes List

- Created implementation-ready Story e.2 context document with inbound SMS ensure, idempotency, and thread continuity constraints.

### File List

- _bmad-output/implementation-artifacts/e-2-inbound-sms-processing-with-active-thread-ensure.md

## Change Log

- 2026-03-03: Created Story e.2 ready-for-dev context document.
