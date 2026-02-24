# Story 2.1: Commitment Domain Model and Transition Rules

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a dispatcher,
I want commitments represented as first-class entities with explicit transitions,
so that execution promises are traceable and terminal-state enforced.

## Acceptance Criteria

1. Given a commitment is created, when its status changes, then only valid lifecycle transitions are allowed.
2. Terminal state is required by policy.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Dispatcher status actions must be explicit and irreversible once terminal.
- Real-User Validation Evidence: Dispatcher can create, transition, and view terminal commitments from Route UI/API.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story focuses commitment lifecycle semantics, not role administration.

## Tasks / Subtasks

- [ ] Define commitment aggregate and state machine (AC: 1, 2)
  - [ ] Add explicit lifecycle states and allowed transition matrix.
  - [ ] Reject invalid transitions with refusal envelope (`HTTP 200`, `ok=false`).
- [ ] Persist transition audit details (AC: 1)
  - [ ] Record actor, timestamp, reason, and previous/new state on every transition.
  - [ ] Ensure audit write occurs in same mutation transaction.
- [ ] Enforce terminal invariants (AC: 2)
  - [ ] Block state changes once commitment reaches terminal state unless policy exception exists.
  - [ ] Add deterministic tests for terminal immutability.
- [ ] Add Route-facing API contract coverage (AC: 1, 2)
  - [ ] Add API tests for valid transitions, invalid transitions, and terminal-state behavior.

## Dev Notes

### Story Intent

Create the canonical commitment lifecycle backbone for RouteShyft Epic 2.

### Technical Requirements

- Commitment lifecycle must be explicit and deterministic.
- Transition enforcement must happen in domain/application layer, not only controller layer.
- Business refusals must follow shared envelope behavior.

### Architecture Compliance

- Use existing Node + Express + TypeScript + Knex stack.
- Keep module boundaries under `src/modules/route/` (`domain`, `application`, `infrastructure`, `api`).

### Library / Framework Requirements

- Reuse existing API envelope and refusal helpers.
- No new framework dependencies are required.

### File Structure Requirements

- Commitment domain model/state machine in `src/modules/route/domain`.
- Transition service/use cases in `src/modules/route/application`.
- Persistence/query logic in `src/modules/route/infrastructure`.
- Endpoints mounted under `/api/v1/route/*` in `src/modules/route/api`.

### Testing Requirements

- Unit tests for transition matrix and terminal lock behavior.
- API tests for contract/envelope consistency.
- Regression tests proving invalid transitions are blocked deterministically.

### Project Context Reference

- Route lane only (`project_lane: routeshyft`).
- Commitment spine is canonical across intake and scheduling.

### Project Structure Notes

- Keep transition rules centralized to prevent drift across donor/cashier intake paths.

### References

- /Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md
- /Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.

### Completion Notes List

- Story created and set to `ready-for-dev`.

### File List

- _bmad-output/implementation-artifacts/2-1-commitment-domain-model-and-transition-rules.md

