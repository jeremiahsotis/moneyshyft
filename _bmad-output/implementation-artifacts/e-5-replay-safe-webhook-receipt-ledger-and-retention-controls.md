# Story e.5: Replay-Safe Webhook Receipt Ledger and Retention Controls

Status: ready-for-dev

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
- Real-User Validation Evidence: Pending implementation. Validate first-seen vs duplicate receipt behavior, retention cleanup, and duplicate-load stability.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Reliability and data-retention scope only; no role administration changes.

## Tasks / Subtasks

- [ ] Implement receipt-ledger dedupe write path (AC: 1, 2)
  - [ ] Enforce unique constraint `(tenant_id, provider, sid, event_type)` in persistence layer.
  - [ ] Gate downstream domain writes on successful first-seen receipt insertion.
- [ ] Implement deterministic duplicate suppression behavior (AC: 1)
  - [ ] Treat unique-constraint conflicts as duplicate webhook receives.
  - [ ] Return stable acknowledgement/refusal semantics without duplicate domain mutations.
- [ ] Implement retention cleanup controls (AC: 3)
  - [ ] Add scheduled cleanup for expired receipt records (180-day policy baseline).
  - [ ] Preserve replay-safety window guarantees and cleanup observability metrics.
- [ ] Add performance and regression coverage (AC: 4)
  - [ ] Duplicate-load tests proving deterministic suppression behavior.
  - [ ] Latency budget checks for webhook ingestion path under duplicate bursts.

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

### Completion Notes List

- Created implementation-ready Story e.5 context document with receipt-ledger dedupe contract and retention-control requirements.

### File List

- _bmad-output/implementation-artifacts/e-5-replay-safe-webhook-receipt-ledger-and-retention-controls.md

## Change Log

- 2026-03-03: Created Story e.5 ready-for-dev context document.
