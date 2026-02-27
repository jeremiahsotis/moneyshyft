# Story c.5: Deterministic Escalation Scheduler with Claim-Only Reset

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a tenant staff escalation responder,
I want escalation progression to run deterministically and reset only on claim,
so that unclaimed threads escalate predictably and operational ownership is explicit.

## Acceptance Criteria

1. Given unclaimed threads with persisted `next_evaluation_at_utc`, when scheduler evaluation runs, then escalation progresses `X -> 2X -> 3X` using persisted timestamps with no in-memory timers, where `X` is integer hours (default `24`, allowed `1-24`).
2. Given explicit claim occurs on a thread, when lifecycle side effects execute, then escalation state resets and pending escalation notifications are canceled.

## Operability Guardrails

- Guardrail Classification Reviewed: yes
- Critical Capability: yes
- Access-Control Story: no
- Backend/API Implies Human Operability: yes
- Frontend/Operator Usability Criteria Included: yes
- Operability Pairing Notes: Escalation progression and reset semantics directly impact who is paged and when; behavior must be deterministic across retries and restarts.
- Real-User Validation Evidence: Pending implementation. Validate escalation stage progression timing and claim-reset outcomes under realistic operational load.
- Real-User Validation Result: pending
- Role-Admin UI Path: N/A
- Role-Admin UI Path Verified: n/a
- Access-Control Exemption Rationale: No role-administration workflow introduced by scheduler logic.

## Tasks / Subtasks

- [x] Implement deterministic due-thread scheduler loop (AC: 1)
  - [x] Select due unclaimed threads by persisted `next_evaluation_at_utc`.
  - [x] Process in bounded batches using row-level locking and re-validation before mutation.
- [x] Implement escalation progression math with orgUnit-configured baseline `X` (AC: 1)
  - [x] Enforce integer-hour baseline range `1-24` with default `24`.
  - [x] Advance stage/count and compute next due timestamp deterministically (`X -> 2X -> 3X`).
- [x] Implement claim-only reset and notification suppression semantics (AC: 2)
  - [x] Reset escalation stage/count and clear/recompute scheduler fields only on explicit claim paths.
  - [x] Ensure pending escalation notifications are suppressed/canceled after claim.
- [x] Implement resilience and replay-safe processing behavior (AC: 1, 2)
  - [x] Ensure behavior remains correct across retries and process restarts.
  - [x] Avoid any in-memory authoritative timers.
- [x] Add scheduler and lifecycle integration coverage (AC: 1, 2)
  - [x] API/integration tests for progression timing and claim reset semantics.
  - [x] Failure/retry tests proving deterministic behavior and no duplicate escalation side effects.

## Dev Notes

### Technical Requirements

- FR coverage: FR-CS-014, FR-CS-015.
- NFR alignment: NFR-CS-008, NFR-CS-009.
- Story dependencies: `c.4`, `a.4`.
- Escalation baseline configuration must match orgUnit settings and policy locks.

### Architecture Compliance

- AD-05 defines escalation progression and claim-only reset semantics.
- Scheduler must use persisted `next_evaluation_at_utc` and avoid in-memory authoritative timing.
- Mutation side effects must remain auditable and deterministic.

### Library / Framework Requirements

- Reuse existing job/worker execution patterns in repository.
- Reuse centralized time service and transaction wrappers.
- Reuse outbox/notification dispatch patterns, avoiding one-off scheduler side channels.

### File Structure Requirements

- Scheduler/worker logic under `src/src/modules/connectshyft/`.
- Claim/reset integration where lifecycle services handle claim transitions.
- Optional config validation updates where orgUnit escalation baseline is parsed.
- Tests in backend integration and API suites under `tests/api/platform/` and related scheduler test locations.

### Testing Requirements

- Validate stage progression timing sequence (`X`, `2X`, `3X`) using controlled clocks.
- Validate claim resets stage/count and suppresses pending escalation notification dispatch.
- Validate no state drift under worker retries or process restarts.
- Validate no duplicate escalation side effects on repeated due-evaluation attempts.

### Previous Story Intelligence

- `a.4` defines baseline escalation configuration contract and validation constraints.
- `c.4` claim lifecycle behavior is prerequisite for correct claim-only reset semantics.
- `d.1` outbound semantics depend on escalation not resetting without claim.

### Git Intelligence Summary

- Existing story and policy artifacts emphasize deterministic behavior and auditability; scheduler logic must be restart-safe and side-effect controlled.

### Latest Technical Information

- Continue using current repository scheduler/job stack and locked escalation semantics from ConnectShyft planning artifacts.

### Project Context Reference

- `_bmad-output/project-context.md`
- `docs/policies/git_policy.md`
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml`

### Story Completion Status

- Ultimate context engine analysis completed - comprehensive developer guide created.

### Project Structure Notes

- Keep escalation progression logic centralized and deterministic.
- Ensure claim reset is the only reset path; outbound attempts without claim must not reset escalation.
- Before implementation, run `npm run branch:ensure-workflow -- --workflow dev-story --story c-5-deterministic-escalation-scheduler-with-claim-only-reset`.

### References

- `_bmad-output/planning-artifacts/epics-ConnectShyft-2026-02-19.md` (Epic c, Story c.5)
- `_bmad-output/planning-artifacts/architecture-ConnectShyft-2026-02-19.md` (AD-05, scheduler model, lifecycle side effects)
- `_bmad-output/planning-artifacts/prd-ConnectShyft-2026-02-19.md` (FR-CS-014, FR-CS-015)
- `_bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml` (dependency map: c.5 depends on c.4 and a.4)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run branch:ensure-workflow -- --workflow dev-story --story c-5-deterministic-escalation-scheduler-with-claim-only-reset` (pass)
- `cd src && npm test -- src/src/modules/connectshyft/__tests__/threads.test.ts` (pass)
- `cd src && npm run build` (pass)
- `npm run test:e2e -- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts --workers=1` (pass)
- `npm run test:e2e -- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.api.spec.ts --workers=1` (pass)

### Completion Notes List

- Added deterministic escalation scheduler evaluation to ConnectShyft thread services (sync + async) with persisted due-time progression `X -> 2X -> 3X`, baseline validation (`1-24`, default `24`), bounded batching, replay-safe output metadata, and row-locking/re-validation updates in Knex persistence.
- Added new `POST /api/v1/connectshyft/internal/escalation/evaluate` route with capability/context enforcement, orgUnit baseline resolution from escalation config, and deterministic evaluation response contract.
- Updated lifecycle claim behavior to return `CONNECTSHYFT_THREAD_CLAIMED` and include explicit claim-reset metadata (`resetReason: claimed`, `notificationsCanceled`) while preserving takeover/close response contracts.
- Enforced claim-only reset semantics in thread state transitions by preserving escalation stage on non-claim `UNCLAIMED` transitions and resetting only on explicit `CLAIMED` transitions.
- Added/expanded scheduler-focused unit coverage in `threads.test.ts` for deterministic timing progression, replay-safe retries, and claim-only reset behavior.
- Fixed review finding: ensure no longer rewrites `next_evaluation_at_utc` on existing threads unless explicitly provided.
- Fixed review finding: claim now executes explicit pending escalation outbox cancellation before reporting `notificationsCanceled`.
- Fixed review finding: scheduler evaluate now returns `CONNECTSHYFT_ESCALATION_CONFIG_UNAVAILABLE` when baseline config retrieval fails (no silent fallback).
- Fixed review finding: c.5 ATDD API suite is now active (no `test.skip`) and aligned to current response codes/contracts.
- Guardrail blocker remains: `Critical Capability: yes` still has pending real-user validation evidence/result, so story remains `in-progress`.

### File List

- _bmad-output/implementation-artifacts/c-5-deterministic-escalation-scheduler-with-claim-only-reset.md
- _bmad-output/implementation-artifacts/sprint-status-connectshyft.yaml
- frontend/src/router/index.ts
- frontend/src/views/RouteShyft/RouteRequestLifecycleView.vue
- src/src/modules/connectshyft/threads.ts
- src/src/modules/connectshyft/__tests__/threads.test.ts
- src/src/modules/route/application/__tests__/intakeService.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/routes/api/v1/__tests__/auth.refresh.test.ts
- src/src/routes/api/v1/__tests__/route.test.ts
- src/src/routes/api/v1/route.ts
- tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.api.spec.ts
- tests/api/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.api.spec.ts
- tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.api.spec.ts
- tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.api.spec.ts
- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts
- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts
- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.api.spec.ts
- tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.atdd.spec.ts
- tests/e2e/platform/2-4-request-to-commitment-linkage-and-terminal-enforcement.spec.ts
- tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.spec.ts
- tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.spec.ts
- tests/support/factories/connectShyftStoryC5Factory.ts
- tests/support/factories/routeShyftStory24Factory.ts
- tests/support/fixtures/connectShyftStoryC5.fixture.ts
- tests/support/fixtures/routeShyftStory24.fixture.ts

## Senior Developer Review (AI)

- 2026-02-26: Addressed 4 review findings (P1 x2, P2 x2): non-claim ensure due-time rewrite, derived-only claim cancellation reporting, scheduler config fallback behavior, and disabled/stale c.5 ATDD coverage.
- Verification:
  - `cd src && npm test -- src/src/modules/connectshyft/__tests__/threads.test.ts` (pass)
  - `cd src && npm run build` (pass)
  - `npm run test:e2e -- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts --workers=1` (pass)
  - `npm run test:e2e -- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.api.spec.ts --workers=1` (pass)

## Change Log

- 2026-02-24: Created Story c.5 ready-for-dev context document.
- 2026-02-26: Implemented deterministic escalation scheduler evaluation, claim-only reset metadata/behavior, new internal scheduler API route, and scheduler unit coverage.
- 2026-02-26: Post-review hardening: fixed ensure due-time rewrite semantics, explicit claim notification cancellation execution, fail-closed scheduler config retrieval, and re-enabled/updated c.5 ATDD suite.
