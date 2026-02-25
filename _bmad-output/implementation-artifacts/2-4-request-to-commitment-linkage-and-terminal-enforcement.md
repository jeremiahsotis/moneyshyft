# Story 2.4: Request-to-Commitment Linkage and Terminal Enforcement

Status: done

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
- Real-User Validation Evidence: Executed operator reconciliation and lifecycle journey via `src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts` covering unresolved queue retrieval, commitment transition, and intake detail lifecycle verification.
- Real-User Validation Result: pass
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-admin flow required for this lifecycle story.

## Tasks / Subtasks

- [x] Define request lifecycle terminal-state policy (AC: 1)
  - [x] Enumerate allowed request terminal outcomes (`refused`, `cancelled`, `committed`).
  - [x] Block undefined/incomplete terminal transitions.
- [x] Implement robust request-commitment linkage rules (AC: 1, 2)
  - [x] Enforce one canonical linkage path from accepted request to commitment.
  - [x] Preserve independent commitment lifecycle after linkage.
- [x] Add reconciliation/query controls for orphan prevention (AC: 1)
  - [x] Provide internal query to find requests without terminal outcomes.
  - [x] Add guardrail checks to prevent unresolved stale request states.
- [x] Add regression and integration tests (AC: 1, 2)
  - [x] Validate request terminal enforcement and commitment independence.

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
- `npm --prefix src test -- --runInBand src/src/modules/route/domain/__tests__/requestLifecycle.test.ts` (pass)
- `npm --prefix src test -- --runInBand` (pass)
- `npm --prefix src test -- --runInBand src/src/modules/route/application/__tests__/intakeService.test.ts src/src/modules/route/infrastructure/__tests__/intakeRequestRepository.test.ts` (pass)
- `npm --prefix src test -- --runInBand` (pass)
- `npm --prefix src test -- --runInBand src/src/modules/route/application/__tests__/intakeService.test.ts src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts` (pass)
- `npm --prefix src test -- --runInBand src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts src/src/modules/route/application/__tests__/intakeService.test.ts src/src/modules/route/infrastructure/__tests__/intakeRequestRepository.test.ts` (pass)
- `npm --prefix src test -- --runInBand` (pass)
- `npm --prefix src run build` (pass)
- `npm --prefix src test -- --runInBand src/src/modules/route/application/__tests__/intakeService.test.ts src/src/modules/route/infrastructure/__tests__/intakeRequestRepository.test.ts src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts` (pass)
- `npm --prefix src test -- --runInBand` (pass)
- `npm --prefix src run build` (pass)

### Completion Notes List

- Story created and set to `ready-for-dev`.
- Implemented request lifecycle terminal-state policy with explicit outcomes (`refused`, `cancelled`, `committed`) and deterministic transition guards.
- Enforced canonical accepted-request linkage by requiring non-empty commitment IDs at repository persistence boundaries.
- Exposed request lifecycle status plus linked commitment lifecycle status in intake resolution so commitment transitions remain independent from terminal request state.
- Added unresolved-request reconciliation query path in repository/application layers with stale-threshold guardrail classification and operator action guidance.
- Added authenticated route endpoint `/api/v1/route/intake/reconciliation/unresolved` and API regression coverage for reconciliation plus commitment-independence behavior.
- Addressed review gaps by running commitment creation and accepted-request persistence inside shared Knex transactions when repositories are Knex-backed.
- Ensured linkage failures close requests with explicit `cancelled` lifecycle semantics (`ROUTESHYFT_INTAKE_LINKAGE_CANCELLED`) and expose upstream linkage failure context.
- Updated unresolved reconciliation queries to return all unresolved requests and classify stale state in the service response.
- Strengthened reconciliation API and application tests with explicit lifecycle/action assertions and transactional linkage coverage.

### Senior Developer Review (AI)

- Review date: 2026-02-25
- Outcome: Approved after fixes
- Resolved findings:
  - Atomic linkage consistency: commitment and accepted-request writes now execute in one transaction for Knex-backed route repositories.
  - Reconciliation completeness: unresolved query now returns fresh and stale pending requests; stale is computed in service output.
  - Cancelled terminal-path reachability: linkage failures now persist explicit cancellation outcome mapped to `requestLifecycleStatus: cancelled`.
  - Reconciliation evidence quality: API tests now assert lifecycle status, issue code/summary, reconciliation actions, and stale classification.

### File List

- _bmad-output/implementation-artifacts/2-4-request-to-commitment-linkage-and-terminal-enforcement.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/src/modules/route/domain/requestLifecycle.ts
- src/src/modules/route/domain/__tests__/requestLifecycle.test.ts
- src/src/modules/route/application/intakeService.ts
- src/src/modules/route/application/commitmentService.ts
- src/src/modules/route/application/__tests__/intakeService.test.ts
- src/src/modules/route/infrastructure/intakeRequestRepository.ts
- src/src/modules/route/infrastructure/commitmentRepository.ts
- src/src/modules/route/infrastructure/__tests__/intakeRequestRepository.test.ts
- src/src/routes/api/v1/route.ts
- src/src/routes/api/v1/__tests__/route.cashier-intake.test.ts
- src/package.json
- src/src/types/bcryptjs.d.ts
- tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.api.spec.ts
- tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts
- tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts
- tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.spec.ts
- tests/support/factories/routeShyftStory24Factory.ts
- tests/support/fixtures/routeShyftStory24.fixture.ts

## Change Log

- 2026-02-25: Implemented request terminal-state domain policy and transition enforcement for `pending -> refused|cancelled|committed`.
- 2026-02-25: Enforced canonical request-to-commitment linkage and exposed independent request/commitment lifecycle status in intake detail resolution.
- 2026-02-25: Added unresolved reconciliation query controls with stale guardrails and new operator endpoint `/api/v1/route/intake/reconciliation/unresolved`, plus regression/integration tests.
- 2026-02-25: Patched Story 2.4 review findings with atomic Knex transaction linkage writes, explicit linkage-cancelled lifecycle closure, full unresolved-query coverage, and stronger reconciliation assertions in service/API tests.
