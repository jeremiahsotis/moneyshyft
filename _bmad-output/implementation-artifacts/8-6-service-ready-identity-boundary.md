# Story 8.6: Service-Ready Identity Boundary

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform maintainer,
I want a service-ready identity boundary interface implemented in-process,
so that identity resolution and dedupe logic can be extracted later without breaking lane behavior now.

## Acceptance Criteria

1. A clear identity module interface is introduced with explicit request/response and error contracts for match/dedupe operations.
2. In-process adapters implement the interface while preserving current lane behavior.
3. Idempotency expectations for identity operations are explicit and enforced by tests.
4. Lane modules consume the boundary interface instead of scattered direct identity logic.
5. Policy/workflow gates and targeted regression tests pass after boundary introduction.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: no
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Identity outcome messaging depends on stable backend contract and operator-facing refusals.
- Real-User Validation Evidence: Manual validation notes required before closeout
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-admin path change in this story.

## Tasks / Subtasks

- [ ] Define identity boundary contract (AC: 1, 3)
  - [ ] Define interface operations, payload schemas, and deterministic error/result types.
  - [ ] Define idempotency semantics and replay-safe behavior.
- [ ] Implement in-process adapter layer (AC: 2)
  - [ ] Add module implementation behind the new interface.
  - [ ] Preserve existing behavior and response contracts.
- [ ] Refactor lane callsites to boundary interface (AC: 4)
  - [ ] Replace direct identity-logic coupling with boundary calls.
  - [ ] Keep changes scoped to interface adoption without broad behavior refactor.
- [ ] Validate and gate (AC: 3, 5)
  - [ ] Add/adjust tests for contract behavior and idempotency.
  - [ ] Run policy, branch/workflow guard, and changed-test validation.

## Dev Notes

### Story Intent

Create a stable identity interface boundary now to de-risk future service extraction.

### Technical Requirements

- Keep implementation in-process for this phase.
- Formalize contract and typed failure paths.
- Enforce idempotent behavior where identity operations can be retried.

### Architecture Compliance

- Align with approved course correction `cc-2026-03-04`, Change C2.
- Pair with Story 8.5 dedupe contract decisions.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-04.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/project-context.md`]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/policies/git_policy.md`]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-03-04: Story created from approved Correct Course proposal (`cc-2026-03-04`, Change C2).
