# Story 2.5: Refusal Outcomes with Structured Alternatives

Status: in-progress

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

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Replace `InMemoryRouteRefusalStore` with durable persistence (DB-backed repository) so refusal outcomes and history survive process restarts and meet AC1 persistence expectations. [src/src/modules/route/application/refusalService.ts]
- [x] [AI-Review][HIGH] Add authentication + capability enforcement on `/api/v1/route/staff/*` refusal/history endpoints; current handlers accept unauthenticated requests. [src/src/modules/route/api/router.ts]
- [x] [AI-Review][HIGH] Remove tenant spoof path from refusal endpoints by rejecting `x-tenant-id` fallback when authenticated tenant context is absent. [src/src/modules/route/api/router.ts]
- [x] [AI-Review][HIGH] Emit durable audit/event-outbox records for refusal writes instead of in-memory timeline-only events to satisfy auditable write requirements. [src/src/modules/route/infrastructure/refusalStore.ts]
- [x] [AI-Review][MEDIUM] Enforce idempotency-key payload consistency (return refusal/conflict on key reuse with different payload) instead of replaying first write silently. [src/src/modules/route/infrastructure/refusalStore.ts]
- [x] [AI-Review][MEDIUM] Add API tests covering unauthenticated refusal attempts and tenant-header spoof attempts to lock security behavior. [src/src/routes/api/v1/__tests__/route.refusal.test.ts]

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

- Story context prepared from Epic 2 planning artifacts (pass: context loaded and mapped to ACs/tasks).
- Implemented Route refusal domain/application/infrastructure/api flow in `src/src/modules/route/*` (pass: modules compile and endpoint contracts resolve).
- Focused remediation regression: `cd src && npm test -- src/modules/route/__tests__/refusalContracts.test.ts src/modules/route/__tests__/refusalService.test.ts src/routes/api/v1/__tests__/route.refusal.test.ts src/__tests__/app-entrypoint-kernel.test.ts` (pass: 4/4 suites, 22/22 tests).
- Backend compile validation: `cd src && npm run build` (pass: TypeScript build succeeded).

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
- Replaced refusal persistence with durable Knex-backed storage and added migration for route refusal outcomes, lifecycle events, idempotency keys, and outbox records.
- Hardened route refusal staff endpoints with authentication + RBAC capability checks and removed `x-tenant-id` fallback trust path.
- Added deterministic idempotency-key payload conflict handling (`409`) and regression coverage for key-reuse mismatch.
- Added API security regression coverage for unauthenticated refusal attempts and tenant-header spoof attempts.

### File List

- _bmad-output/implementation-artifacts/2-5-refusal-outcomes-with-structured-alternatives.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- frontend/src/features/connectshyft/uiContracts.ts
- frontend/src/views/ConnectShyft/ConnectShyftThreadDetailView.vue
- src/src/migrations/20260227123000_create_connectshyft_sms_preference_overrides.ts
- src/src/migrations/20260227150000_add_connectshyft_sms_override_reason_constraint.ts
- src/src/migrations/20260227170000_create_route_refusal_persistence.ts
- src/src/modules/connectshyft/__tests__/readContracts.test.ts
- src/src/modules/connectshyft/__tests__/smsPreferenceOverrides.test.ts
- src/src/modules/connectshyft/__tests__/threads.test.ts
- src/src/modules/connectshyft/readContracts.ts
- src/src/modules/connectshyft/smsPreferenceOverrides.ts
- src/src/modules/connectshyft/threads.ts
- src/src/modules/route/__tests__/refusalContracts.test.ts
- src/src/modules/route/__tests__/refusalService.test.ts
- src/src/modules/route/api/router.ts
- src/src/modules/route/application/refusalService.ts
- src/src/modules/route/domain/refusal.ts
- src/src/modules/route/infrastructure/refusalStore.ts
- src/src/platform/mutations/__tests__/executePlatformMutation.test.ts
- src/src/platform/mutations/executePlatformMutation.ts
- src/src/routes/api/v1/__tests__/auth.refresh.test.ts
- src/src/routes/api/v1/__tests__/route.refusal.test.ts
- src/src/routes/api/v1/connectshyft.ts
- src/src/routes/api/v1/route.ts
- tests/api/platform/2-5-refusal-outcomes-with-structured-alternatives.api.spec.ts
- tests/api/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.api.spec.ts
- tests/api/platform/a-1-connectshyft-feature-flag-and-availability-guardrails.api.spec.ts
- tests/api/platform/a-2-tenant-and-orgunit-context-enforcement-for-connectshyft-routes.api.spec.ts
- tests/api/platform/c-4-claim-takeover-and-close-lifecycle-actions.automate.api.spec.ts
- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.api.spec.ts
- tests/api/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.api.spec.ts
- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.api.spec.ts
- tests/api/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.automate.api.spec.ts
- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.api.spec.ts
- tests/api/platform/d-2-preference-override-enforcement-for-outbound-sms.automate.api.spec.ts
- tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.api.spec.ts
- tests/api/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.automate.api.spec.ts
- tests/api/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.api.spec.ts
- tests/e2e/platform/2-5-refusal-outcomes-with-structured-alternatives.atdd.spec.ts
- tests/e2e/platform/2-5-refusal-outcomes-with-structured-alternatives.spec.ts
- tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.atdd.spec.ts
- tests/e2e/platform/c-5-deterministic-escalation-scheduler-with-claim-only-reset.automate.spec.ts
- tests/e2e/platform/d-1-outbound-sms-call-actions-that-preserve-escalation-semantics.atdd.spec.ts
- tests/e2e/platform/d-2-preference-override-enforcement-for-outbound-sms.atdd.spec.ts
- tests/e2e/platform/d-3-outbound-audit-outbox-and-refusal-envelope-integration.atdd.spec.ts
- tests/e2e/platform/d-4-operator-interaction-contracts-for-outbound-safety.atdd.spec.ts
- tests/support/factories/connectShyftStoryC5Factory.ts
- tests/support/factories/connectShyftStoryD1Factory.ts
- tests/support/factories/connectShyftStoryD2Factory.ts
- tests/support/factories/connectShyftStoryD3Factory.ts
- tests/support/factories/connectShyftStoryD4Factory.ts
- tests/support/factories/connectShyftStoryDFactory.ts
- tests/support/factories/routeShyftStory25Factory.ts
- tests/support/fixtures/connectShyftStoryC5.fixture.ts
- tests/support/fixtures/connectShyftStoryD.fixture.ts
- tests/support/fixtures/connectShyftStoryD1.fixture.ts
- tests/support/fixtures/connectShyftStoryD2.fixture.ts
- tests/support/fixtures/connectShyftStoryD3.fixture.ts
- tests/support/fixtures/connectShyftStoryD4.fixture.ts
- tests/support/fixtures/routeShyftStory25.fixture.ts

## Senior Developer Review (AI)

- Reviewer: Jeremiah (AI)
- Date: 2026-02-27
- Outcome: Resolved
- Summary: Original review found 4 High, 2 Medium, 0 Low issues. All six findings are now remediated in code and tests.
- Validation: `cd src && npm test -- src/modules/route/__tests__/refusalContracts.test.ts src/modules/route/__tests__/refusalService.test.ts src/routes/api/v1/__tests__/route.refusal.test.ts src/__tests__/app-entrypoint-kernel.test.ts` (4/4 suites passed, 22/22 tests passed after remediation).

## Change Log

- 2026-02-27: Implemented Story 2.5 refusal outcomes with structured alternatives, idempotent refusal persistence, lifecycle history endpoints, and contract/regression test coverage.
- 2026-02-27: Senior Developer Review (AI) completed; added 6 follow-up action items and set story status to in-progress pending security/persistence/audit fixes.
- 2026-02-27: Resolved all 6 review findings: durable refusal persistence + outbox, auth/capability enforcement, tenant spoof hardening, idempotency conflict handling, and security regression tests.
