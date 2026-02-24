# Story 2.5: Refusal Outcomes with Structured Alternatives

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a requester,
I want refusal outcomes with alternatives before or after commitment creation,
so that refusal is explicit, understandable, and actionable.

## Acceptance Criteria

1. Given scheduling or execution cannot proceed, when refusal is issued, then refusal reason and structured alternatives are persisted.
2. Refusal is visible in lifecycle/audit history.
3. Given requester or staff views a refusal outcome, when alternatives are presented, then the UI/API contract provides explicit, user-actionable next-step options.

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

- [ ] Define refusal taxonomy and alternative payload contract (AC: 1)
  - [ ] Standardize refusal reason codes and explanation fields.
  - [ ] Define structured alternatives schema (reschedule windows, partner referral, callback path, etc.).
- [ ] Persist refusal outcomes across intake and execution stages (AC: 1)
  - [ ] Support refusal issuance before commitment creation and after commitment lifecycle starts.
  - [ ] Ensure refusal writes are idempotent and auditable.
- [ ] Expose refusal history in lifecycle/audit views (AC: 2)
  - [ ] Include refusal metadata in request and commitment history endpoints.
  - [ ] Preserve envelope semantics for refusal responses.
- [ ] Add contract and regression tests (AC: 1, 2)
  - [ ] Validate refusal persistence and alternatives schema consistency.

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

- Refusal reason/alternative contracts in `src/src/modules/route/domain`.
- Refusal application service orchestration in `src/src/modules/route/application`.
- History projection support in `src/src/modules/route/infrastructure` with route handlers in `src/src/routes/api/v1/*.ts`.

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

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.5)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (refusal outcome and alternatives requirements)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-5-refusal-outcomes-with-structured-alternatives.md
