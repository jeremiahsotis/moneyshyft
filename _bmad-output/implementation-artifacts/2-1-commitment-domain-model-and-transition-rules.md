# Story 2.1: Commitment Domain Model and Transition Rules

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a dispatcher,
I want commitments represented as first-class entities with explicit transitions,
so that execution promises are traceable and terminal-state enforced.

## Acceptance Criteria

1. Given a commitment is created, when its status changes, then only valid lifecycle transitions are allowed.
2. Terminal state is required by policy.
3. Given a dispatcher views or updates a commitment, when a transition is valid or refused, then the UI/API surfaces explicit actionable state and refusal details without ambiguity.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Dispatcher status actions must be explicit and irreversible once terminal.
- Real-User Validation Evidence: 2026-02-24 API validation passed using real signup/login cookies and CSRF proof tokens; dispatcher created commitment, transitioned `scheduled -> in_progress -> completed`, resolved terminal state, and verified post-terminal refusal (`ROUTE_COMMITMENT_TERMINAL_STATE_LOCKED`). Evidence bundle: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/test-artifacts/story-2-1-real-user-20260224-165031`.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: Story focuses commitment lifecycle semantics, not role administration.

## Tasks / Subtasks

- [x] Define commitment aggregate and state machine (AC: 1, 2)
  - [x] Add explicit lifecycle states and allowed transition matrix.
  - [x] Reject invalid transitions with refusal envelope (`HTTP 200`, `ok=false`).
- [x] Persist transition audit details (AC: 1)
  - [x] Record actor, timestamp, reason, and previous/new state on every transition.
  - [x] Ensure audit write occurs in same mutation transaction.
- [x] Enforce terminal invariants (AC: 2)
  - [x] Block state changes once commitment reaches terminal state unless policy exception exists.
  - [x] Add deterministic tests for terminal immutability.
- [x] Add Route-facing API contract coverage (AC: 1, 2)
  - [x] Add API tests for valid transitions, invalid transitions, and terminal-state behavior.

## Dev Notes

### Story Intent

Create the canonical commitment lifecycle backbone for RouteShyft Epic 2.

### Technical Requirements

- Commitment lifecycle must be explicit and deterministic.
- Transition enforcement must happen in domain/application layer, not only controller layer.
- Business refusals must follow shared envelope behavior.

### Architecture Compliance

- Use existing Node + Express + TypeScript + Knex stack.
- Keep module boundaries under `src/src/modules/route/` (`domain`, `application`, `infrastructure`, `api`).

### Library / Framework Requirements

- Reuse existing API envelope and refusal helpers.
- No new framework dependencies are required.

### File Structure Requirements

- Commitment domain model/state machine in `src/src/modules/route/domain`.
- Transition service/use cases in `src/src/modules/route/application`.
- Persistence/query logic in `src/src/modules/route/infrastructure`.
- Route endpoints mounted under `/api/v1/route/*` from `src/src/routes/api/v1/*.ts`, with handlers delegating to route module services.

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

- [Source: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/planning-artifacts/epics.md` (Epic 2 > Story 2.1)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Architecture_Document.md` (Stack, Module Layout)]
- [Source: `/Users/jeremiahotis/projects/routeshyft/docs/routeshyft/RouteShyft_Functional_Requirements.md` (commitment lifecycle requirements)]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context prepared from Epic 2 planning artifacts.
- Added Route commitment lifecycle domain model and transition evaluator in `src/src/modules/route/domain/commitmentLifecycle.ts`.
- Added application service and persistence layers in `src/src/modules/route/application/commitmentService.ts` and `src/src/modules/route/infrastructure/commitmentRepository.ts`.
- Added Route API endpoints in `src/src/routes/api/v1/route.ts` and mounted `/api/v1/route` in shared route registration.
- Added route schema migration for `route.commitments` and `route.commitment_transition_audit`.
- Validation run:
  - `cd src && npm run build`
  - `cd src && npm test -- src/modules/route/domain/__tests__/commitmentLifecycle.test.ts src/modules/route/application/__tests__/commitmentService.test.ts src/modules/route/infrastructure/__tests__/commitmentRepository.test.ts src/migrations/__tests__/routeCommitmentLifecycleMigration.test.ts`
  - `cd src && npm test -- src/routes/api/v1/__tests__/route.commitments.test.ts src/__tests__/app-entrypoint-kernel.test.ts`
  - `cd src && npm test`
- Senior review remediation run:
  - `cd src && npm test -- src/modules/route/application/__tests__/commitmentService.test.ts src/routes/api/v1/__tests__/route.commitments.test.ts src/migrations/__tests__/routeCommitmentLifecycleMigration.test.ts src/modules/route/domain/__tests__/commitmentLifecycle.test.ts src/modules/route/infrastructure/__tests__/commitmentRepository.test.ts src/__tests__/app-entrypoint-kernel.test.ts`
  - `cd src && npm run build`
  - `cd src && npm test`
- Real-user validation run (local API evidence):
  - `cd src && npm run migrate:latest`
  - `npm run dev` (backend on `http://localhost:3000`)
  - Auth + lifecycle validation artifacts captured under `/Users/jeremiahotis/projects/routeshyft/_bmad-output/test-artifacts/story-2-1-real-user-20260224-165031`

### Completion Notes List

- Story created and set to `ready-for-dev`.
- Implemented canonical commitment lifecycle states (`scheduled`, `in_progress`, `completed`, `canceled`, `refused`) with deterministic transition matrix and terminal-state lock.
- Invalid transitions and terminal lock outcomes return refusal semantics aligned to `HTTP 200` + `ok=false` with explicit actionable state details.
- Transition persistence now writes commitment mutation and transition audit metadata atomically in a single transaction.
- Added Route-facing endpoints for commitment create/read/transition and registered `/api/v1/route` route namespace.
- Added migration and test coverage for transition audit schema, domain transition rules, transaction-level persistence behavior, and route contract flows.
- Full backend Jest regression suite passed.
- Hardened policy-exception transitions to require elevated authorization and added regression tests for unauthorized/authorized override paths.
- Enforced create-time orgUnit scope matching to active context and added API refusal coverage for mismatched orgUnit requests.
- Added tenant+commitment composite integrity constraint for transition-audit linkage in migration and migration tests.
- Completed real-user API validation evidence for dispatcher commitment lifecycle and terminal lock guardrail.

### File List

- _bmad-output/implementation-artifacts/2-1-commitment-domain-model-and-transition-rules.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/src/__tests__/app-entrypoint-kernel.test.ts
- src/src/api/registerRoutes.ts
- src/src/migrations/20260224153000_create_route_commitments_and_transition_audit.ts
- src/src/migrations/__tests__/routeCommitmentLifecycleMigration.test.ts
- src/src/modules/route/application/__tests__/commitmentService.test.ts
- src/src/modules/route/application/commitmentService.ts
- src/src/modules/route/domain/__tests__/commitmentLifecycle.test.ts
- src/src/modules/route/domain/commitmentLifecycle.ts
- src/src/modules/route/infrastructure/__tests__/commitmentRepository.test.ts
- src/src/modules/route/infrastructure/commitmentRepository.ts
- src/src/routes/api/v1/__tests__/route.commitments.test.ts
- src/src/routes/api/v1/route.ts

### Change Log

- 2026-02-24: Implemented commitment lifecycle domain + transition matrix, added atomic transition audit persistence, mounted `/api/v1/route` commitment endpoints, added migration and full regression-validated test coverage.
- 2026-02-24: Senior review remediation fixed 2 High + 2 Medium findings (policy-exception authorization, orgUnit scope enforcement, audit FK tenant consistency, negative-path regression coverage). Story status set to `in-progress` pending real-user validation guardrail pass.
- 2026-02-24: Completed real-user validation evidence capture (signup/login + CSRF-protected Route lifecycle create/transition/resolve + post-terminal refusal) and cleared critical-capability operability guardrail.

## Senior Developer Review (AI)

### Reviewer

Jeremiah

### Date

2026-02-24

### Outcome

- Resolved all identified review findings in this pass:
  - High: terminal policy-exception bypass risk
  - High: client-controlled orgUnit spoofing risk
  - Medium: audit tenant/commitment integrity gap
  - Medium: missing negative-path tests
- Critical-capability guardrail is satisfied with `Real-User Validation Result: pass`.

### Validation Evidence

- `cd src && npm test -- src/modules/route/application/__tests__/commitmentService.test.ts src/routes/api/v1/__tests__/route.commitments.test.ts src/migrations/__tests__/routeCommitmentLifecycleMigration.test.ts src/modules/route/domain/__tests__/commitmentLifecycle.test.ts src/modules/route/infrastructure/__tests__/commitmentRepository.test.ts src/__tests__/app-entrypoint-kernel.test.ts`
- `cd src && npm run build`
- `cd src && npm test`
- Real-user evidence bundle: `/Users/jeremiahotis/projects/routeshyft/_bmad-output/test-artifacts/story-2-1-real-user-20260224-165031`
