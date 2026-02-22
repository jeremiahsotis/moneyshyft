# Story a.5: Capability-Based Route Access and Envelope Contract Compliance

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tenant operations lead,
I want capability checks and response envelopes to be consistent across ConnectShyft APIs,
so that client behavior is predictable and unauthorized operations are safely refused.

## Acceptance Criteria

1. Given users with different role capabilities call ConnectShyft APIs, when authorization executes, then permission checks are enforced server-side at endpoint and service boundaries.
2. Given any ConnectShyft API response path (success, refused, system error), when serialization executes, then all responses follow shared `success/refusal/systemError` envelope semantics.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: yes
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: UI behavior must map refusal reasons to actionable operator feedback without exposing unauthorized data.
- Real-User Validation Evidence: Capability matrix tests + endpoint/service boundary authorization checks.
- Real-User Validation Result: pending
- Role-Admin UI Path: Tenant admin role/capability assignment path must be testable for coverage scenarios.
- Role-Admin UI Path Verified: pending
- Access-Control Exemption Rationale: N/A

## Tasks / Subtasks

- [ ] Implement capability checks across endpoint and service layers (AC: 1)
  - [ ] Apply role/capability checks at route guard and business-service boundaries.
  - [ ] Ensure deny-by-default behavior for unauthorized operations.
- [ ] Enforce envelope contract compliance for all ConnectShyft responses (AC: 2)
  - [ ] Use shared `success/refusal/systemError` envelope helpers.
  - [ ] Remove or prevent non-standard ad hoc response shapes in ConnectShyft endpoints.
- [ ] Add coverage tests for capability and envelope behavior (AC: 1, 2)
  - [ ] API contract tests for authorized vs unauthorized capability paths.
  - [ ] Response-shape tests for success/refusal/systemError variants.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-001, FR-CS-002, FR-CS-003.
- NFR coverage: NFR-CS-001, NFR-CS-002, NFR-CS-004.
- Depends on: a.2 tenant/orgUnit context enforcement.
- Parallel lane: lane-a-platform-guards.

### Architecture Compliance

- Maintain strict tenant/orgUnit boundary checks while enforcing capabilities.
- Keep response envelope behavior consistent across all ConnectShyft APIs.

### File Structure Requirements

- Backend auth/capability guards and response helpers: `src/src/platform/` and `src/src/modules/connectshyft/`.
- API routes: `src/src/routes/api/v1/`.
- Tests: `tests/api/platform/` plus targeted integration tests under `src/`.

### Testing Requirements

- Validate capability matrix behavior per role and context.
- Validate refusal semantics for unauthorized calls with no data leakage.
- Validate shared envelope compliance for success, refusal, and system error paths.

### Project Structure Notes

- Reuse existing shared envelope utilities and authorization patterns.
- Keep ConnectShyft and RouteShyft boundaries isolated during implementation.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic a, Story a.5)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (Policy/envelope and bounded-module constraints)
- `_bmad-output/planning-artifacts/ux-design-specification-ConnectShyft-2026-02-19.md` (Refusal behavior and operator interaction constraints)
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context creation only; implementation logs pending.

### Completion Notes List

- Created ConnectShyft Epic A context for capability enforcement and envelope contract compliance with dependency on a.2.

### File List

- _bmad-output/implementation-artifacts/a-5-capability-based-route-access-and-envelope-contract-compliance.md
