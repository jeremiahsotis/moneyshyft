# Story 2.5: Refusal Outcomes with Structured Alternatives

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a requester,
I want refusal outcomes with alternatives before or after commitment creation,
so that refusal is explicit, understandable, and actionable.

## Acceptance Criteria

1. Given scheduling or execution cannot proceed, when refusal is issued, then refusal reason and structured alternatives are persisted.
2. Refusal is visible in lifecycle/audit history.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Refusal UX must provide clear next-step alternatives and reason codes.
- Real-User Validation Evidence: Requesters and staff can view refusal reason, alternatives, and audit trail in UI/API.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No access-control administration in scope.

## Tasks / Subtasks

- [x] Define refusal taxonomy and alternative payload contract (AC: 1)
  - [x] Standardize refusal reason codes and explanation fields.
  - [x] Define structured alternatives schema (reschedule windows, partner referral, callback path, etc.).
- [x] Persist refusal outcomes across intake and execution stages (AC: 1)
  - [x] Support refusal issuance before commitment creation and after commitment lifecycle starts.
  - [x] Ensure refusal writes are idempotent and auditable.
- [x] Expose refusal history in lifecycle/audit views (AC: 2)
  - [x] Include refusal metadata in request and commitment history endpoints.
  - [x] Preserve envelope semantics for refusal responses.
- [x] Add contract and regression tests (AC: 1, 2)
  - [x] Validate refusal persistence and alternatives schema consistency.

## Dev Notes

### Story Intent

Make refusal a first-class, policy-safe lifecycle outcome with actionable alternatives.

### Technical Requirements

- Refusal behavior must use shared response envelope semantics (`HTTP 200`, `ok=false` for business refusal paths).
- Alternative options must be structured (not free-text only) for downstream reporting and UX consistency.
- Refusal outcomes must remain visible in audit/history interfaces.

### Architecture Compliance

- Keep refusal policy definitions centralized in route domain.
- Route intake/execution adapters should call shared refusal services.

### Library / Framework Requirements

- No new framework dependencies required.

### File Structure Requirements

- Refusal reason/alternative contracts in `src/modules/route/domain`.
- Refusal application service orchestration in `src/modules/route/application`.
- History projection support in `src/modules/route/infrastructure` + `api`.

### Testing Requirements

- Unit tests for refusal reason and alternatives contract validation.
- API tests for refusal issuance at pre-commitment and post-commitment phases.
- Audit history tests confirming refusal visibility.

### Project Context Reference

- Route lane only (`project_lane: routeshyft`).
- Refusal must remain explicit and dignity-safe per Route requirements.

### Project Structure Notes

- Reuse refusal envelope helpers from prior platform and route stories.

### References

- /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.
- Implemented Route refusal domain/application/infrastructure/api flow in `src/src/modules/route/*`.
- Full regression run: `cd src && npm test` (39 passed, 1 skipped).

### Implementation Plan

- Introduce canonical refusal taxonomy + structured alternatives validation in route domain.
- Persist refusal outcomes via shared route refusal store with idempotency and lifecycle event projection.
- Expose request/commitment refusal issuance + history endpoints under `/api/v1/route/staff/*`.
- Add unit/service/API regression tests and wire route registration into v1 route registry.

### Completion Notes List

- Added canonical refusal reason taxonomy and stage-aware structured alternative contract validation.
- Added refusal persistence service with idempotent replay support and lifecycle/audit event projection.
- Added route API endpoints for request refusal, commitment refusal, request history, and commitment history.
- Preserved business-refusal envelope semantics (`HTTP 200`, `ok=false`) for refusal validation failures.
- Added unit tests (contracts + service), API contract/regression tests, and updated route registration tests.

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/2-5-refusal-outcomes-with-structured-alternatives.md
- src/src/__tests__/app-entrypoint-kernel.test.ts
- src/src/api/registerRoutes.ts
- src/src/modules/route/__tests__/refusalContracts.test.ts
- src/src/modules/route/__tests__/refusalService.test.ts
- src/src/modules/route/api/router.ts
- src/src/modules/route/application/refusalService.ts
- src/src/modules/route/domain/refusal.ts
- src/src/modules/route/infrastructure/refusalStore.ts
- src/src/routes/api/v1/__tests__/route.refusal.test.ts
- src/src/routes/api/v1/route.ts

## Change Log

- 2026-02-27: Implemented Story 2.5 refusal outcomes with structured alternatives, idempotent refusal persistence, lifecycle history endpoints, and contract/regression test coverage.
