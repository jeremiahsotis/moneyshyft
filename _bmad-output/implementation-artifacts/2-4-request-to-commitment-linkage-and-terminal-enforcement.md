# Story 2.4: Request-to-Commitment Linkage and Terminal Enforcement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As operations staff,
I want each request to end in refusal/cancellation or linked commitment,
so that no request is lost in undefined state.

## Acceptance Criteria

1. Given a request lifecycle starts, when it is processed, then it reaches an explicit terminal request state.
2. Linked commitments independently reach terminal commitment states.
3. Given operations staff review unresolved work, when terminal enforcement or linkage failures occur, then UI/API views expose clear reconciliation actions and current lifecycle status.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Operations must be able to identify unresolved requests and drive deterministic closure.
- Real-User Validation Evidence: Staff can query unresolved records and complete lifecycle to terminal outcome.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-admin flow required for this lifecycle story.

## Tasks / Subtasks

- [ ] Define request lifecycle terminal-state policy (AC: 1)
  - [ ] Enumerate allowed request terminal outcomes (`refused`, `cancelled`, `committed`).
  - [ ] Block undefined/incomplete terminal transitions.
- [ ] Implement robust request-commitment linkage rules (AC: 1, 2)
  - [ ] Enforce one canonical linkage path from accepted request to commitment.
  - [ ] Preserve independent commitment lifecycle after linkage.
- [ ] Add reconciliation/query controls for orphan prevention (AC: 1)
  - [ ] Provide internal query to find requests without terminal outcomes.
  - [ ] Add guardrail checks to prevent unresolved stale request states.
- [ ] Add regression and integration tests (AC: 1, 2)
  - [ ] Validate request terminal enforcement and commitment independence.

## Dev Notes

### Story Intent

Ensure intake lifecycle integrity by preventing requests from drifting into ambiguous states.

### Technical Requirements

- Request lifecycle and commitment lifecycle are linked but distinct state machines.
- Terminal state enforcement must be explicit and test-backed.
- Refusal/cancellation flows must preserve auditability and deterministic outcomes.

### Architecture Compliance

- Implement state management in domain/application services under route module boundaries.
- Keep lifecycle transition and linkage writes transactionally consistent.

### Library / Framework Requirements

- Existing stack only; no additional framework requirements.

### File Structure Requirements

- Request lifecycle rules in `src/src/modules/route/domain`.
- Linkage orchestration in `src/src/modules/route/application`.
- Persistence/reconciliation queries in `src/src/modules/route/infrastructure`.
- Operational endpoints in `src/src/routes/api/v1/*.ts` delegating into route services.

### Testing Requirements

- Tests for terminal request completion coverage.
- Tests for independent commitment lifecycle behavior post-linkage.
- Negative tests for orphaned or invalid lifecycle paths.

### Project Context Reference

- Route lane only (`project_lane: routeshyft`).
- Epic 2 requirement: every request must resolve to explicit refusal/cancel/commitment outcome.

### Project Structure Notes

- Reuse transition and audit primitives from Stories 2.1–2.3 where possible.

### References

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.4)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (request lifecycle and terminal-state requirements)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-4-request-to-commitment-linkage-and-terminal-enforcement.md
